const { app, BrowserWindow, Menu, ipcMain, dialog, shell, screen, Tray, nativeImage } = require('electron');
const { DatabaseSync } = require('node:sqlite');
const { spawn, execFile } = require('child_process');
const path = require('path'), fs = require('fs');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

const POLL = 4000, GRACE = 15000, NOSHOW = 90000;
let win, db, overlayWin;
const active = new Map(); // gameId -> one tracker per game (prevents duplicate timers)

// ---- Overlay settings
const OVERLAY_SETTINGS_PATH = () => path.join(app.getPath('userData'), 'overlay-settings.json');
const VALID_LAYOUTS = ['vertical', 'horizontal', 'compact', 'expanded'];
const VALID_SIZES = ['small', 'medium', 'large'];
const VALID_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'custom'];
const DEFAULT_OVERLAY = {
  enabled: false,
  layout: 'vertical',
  size: 'medium',
  position: 'top-right',
  customX: null,
  customY: null,
  metrics: { fps: true, cpu: true, gpu: true, vram: true, ram: true, cpuTemp: true, gpuTemp: true }
};
let overlaySettings = { ...DEFAULT_OVERLAY, metrics: { ...DEFAULT_OVERLAY.metrics } };
let perfTimer = null;
let overlayBounds = { width: 220, height: 360 };
let dragState = null;
let dragInterval = null;

function sanitizeOverlaySettings(raw) {
  const s = { ...DEFAULT_OVERLAY, ...(raw || {}) };
  if (!VALID_LAYOUTS.includes(s.layout)) s.layout = DEFAULT_OVERLAY.layout;
  if (!VALID_SIZES.includes(s.size)) s.size = DEFAULT_OVERLAY.size;
  if (!VALID_POSITIONS.includes(s.position)) s.position = DEFAULT_OVERLAY.position;
  s.enabled = !!s.enabled;
  s.customX = Number.isFinite(s.customX) ? Math.round(s.customX) : null;
  s.customY = Number.isFinite(s.customY) ? Math.round(s.customY) : null;
  s.metrics = { ...DEFAULT_OVERLAY.metrics, ...((raw && raw.metrics) || {}) };
  for (const k of Object.keys(DEFAULT_OVERLAY.metrics)) s.metrics[k] = !!s.metrics[k];
  return s;
}

function loadOverlaySettings() {
  try {
    const raw = JSON.parse(fs.readFileSync(OVERLAY_SETTINGS_PATH(), 'utf8'));
    overlaySettings = sanitizeOverlaySettings(raw);
  } catch {
    overlaySettings = sanitizeOverlaySettings({});
  }
}

function saveOverlaySettings() {
  try { fs.writeFileSync(OVERLAY_SETTINGS_PATH(), JSON.stringify(overlaySettings, null, 2)); } catch {}
}

// ---- Native Performance & Process Helper Daemon (zero-PowerShell-spawn telemetry + process scanning)
const HELPER_VERSION = '2';
const HELPER_CS_SOURCE = `using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

class Program {
    [StructLayout(LayoutKind.Sequential)]
    struct FILETIME {
        public uint dwLowDateTime;
        public uint dwHighDateTime;
        public ulong ToUInt64() { return ((ulong)dwHighDateTime << 32) | dwLowDateTime; }
    }

    [StructLayout(LayoutKind.Sequential)]
    struct MEMORYSTATUSEX {
        public uint dwLength;
        public uint dwMemoryLoad;
        public ulong ullTotalPhys;
        public ulong ullAvailPhys;
        public ulong ullTotalPageFile;
        public ulong ullAvailPageFile;
        public ulong ullTotalVirtual;
        public ulong ullAvailVirtual;
        public ulong ullAvailExtendedVirtual;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct PROCESSENTRY32W {
        public uint dwSize;
        public uint cntUsage;
        public uint th32ProcessID;
        public IntPtr th32DefaultHeapID;
        public uint th32ModuleID;
        public uint cntThreads;
        public uint th32ParentProcessID;
        public int pcPriClassBase;
        public uint dwFlags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)]
        public string szExeFile;
    }

    [DllImport("kernel32.dll")] static extern bool GetSystemTimes(out FILETIME idle, out FILETIME kernel, out FILETIME user);
    [DllImport("kernel32.dll")] static extern bool GlobalMemoryStatusEx(ref MEMORYSTATUSEX mem);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern IntPtr LoadLibraryW(string path);
    [DllImport("kernel32.dll", CharSet = CharSet.Ansi)] static extern IntPtr GetProcAddress(IntPtr hMod, string name);
    [DllImport("kernel32.dll")] static extern uint GetCurrentProcessId();
    [DllImport("kernel32.dll")] static extern IntPtr CreateToolhelp32Snapshot(uint dwFlags, uint th32ProcessID);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern bool Process32FirstW(IntPtr hSnapshot, ref PROCESSENTRY32W lppe);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern bool Process32NextW(IntPtr hSnapshot, ref PROCESSENTRY32W lppe);
    [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern bool QueryFullProcessImageNameW(IntPtr hProcess, int flags, StringBuilder exeName, ref int size);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr hObject);
    [DllImport("kernel32.dll")] static extern bool QueryPerformanceCounter(out long lpPerformanceCount);
    [DllImport("kernel32.dll")] static extern bool QueryPerformanceFrequency(out long lpFrequency);

    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] static extern IntPtr GetDC(IntPtr hWnd);
    [DllImport("user32.dll")] static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);
    [DllImport("gdi32.dll")] static extern int GetDeviceCaps(IntPtr hdc, int nIndex);

    [DllImport("pdh.dll", CharSet = CharSet.Unicode)] static extern uint PdhOpenQueryW(string src, IntPtr ud, out IntPtr query);
    [DllImport("pdh.dll", CharSet = CharSet.Unicode)] static extern uint PdhAddEnglishCounterW(IntPtr query, string path, IntPtr ud, out IntPtr counter);
    [DllImport("pdh.dll")] static extern uint PdhCollectQueryData(IntPtr query);
    [DllImport("pdh.dll", CharSet = CharSet.Unicode)] static extern uint PdhGetFormattedCounterArrayW(IntPtr counter, uint fmt, ref uint bufSize, out uint count, IntPtr buf);
    [DllImport("pdh.dll")] static extern uint PdhCloseQuery(IntPtr query);

    // ---- NVML
    [StructLayout(LayoutKind.Sequential)] struct NvmlUtilization { public uint gpu; public uint memory; }
    [StructLayout(LayoutKind.Sequential)] struct NvmlMemory { public ulong total; public ulong free; public ulong used; }
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int DelNvmlInit();
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int DelNvmlShutdown();
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int DelNvmlGetHandle(uint index, out IntPtr device);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int DelNvmlGetUtil(IntPtr device, out NvmlUtilization util);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int DelNvmlGetMem(IntPtr device, out NvmlMemory mem);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int DelNvmlGetTemp(IntPtr device, uint sensor, out uint temp);

    static IntPtr hNvml = IntPtr.Zero;
    static IntPtr nvmlDevice = IntPtr.Zero;
    static DelNvmlGetUtil nvmlGetUtil;
    static DelNvmlGetMem nvmlGetMem;
    static DelNvmlGetTemp nvmlGetTemp;
    static DelNvmlShutdown nvmlShutdown;

    static void InitNvml() {
        try {
            hNvml = LoadLibraryW("nvml.dll");
            if (hNvml == IntPtr.Zero) {
                string sys = Environment.GetFolderPath(Environment.SpecialFolder.System);
                hNvml = LoadLibraryW(Path.Combine(sys, "nvml.dll"));
            }
            if (hNvml == IntPtr.Zero) return;
            IntPtr pInit = GetProcAddress(hNvml, "nvmlInit_v2");
            if (pInit == IntPtr.Zero) pInit = GetProcAddress(hNvml, "nvmlInit");
            IntPtr pGetH = GetProcAddress(hNvml, "nvmlDeviceGetHandleByIndex_v2");
            if (pGetH == IntPtr.Zero) pGetH = GetProcAddress(hNvml, "nvmlDeviceGetHandleByIndex");
            IntPtr pUtil = GetProcAddress(hNvml, "nvmlDeviceGetUtilizationRates");
            IntPtr pMem = GetProcAddress(hNvml, "nvmlDeviceGetMemoryInfo");
            IntPtr pTemp = GetProcAddress(hNvml, "nvmlDeviceGetTemperature");
            IntPtr pShut = GetProcAddress(hNvml, "nvmlShutdown");
            if (pInit != IntPtr.Zero && pGetH != IntPtr.Zero) {
                var fnInit = (DelNvmlInit)Marshal.GetDelegateForFunctionPointer(pInit, typeof(DelNvmlInit));
                var fnGetH = (DelNvmlGetHandle)Marshal.GetDelegateForFunctionPointer(pGetH, typeof(DelNvmlGetHandle));
                if (fnInit() == 0 && fnGetH(0, out nvmlDevice) == 0) {
                    if (pUtil != IntPtr.Zero) nvmlGetUtil = (DelNvmlGetUtil)Marshal.GetDelegateForFunctionPointer(pUtil, typeof(DelNvmlGetUtil));
                    if (pMem != IntPtr.Zero) nvmlGetMem = (DelNvmlGetMem)Marshal.GetDelegateForFunctionPointer(pMem, typeof(DelNvmlGetMem));
                    if (pTemp != IntPtr.Zero) nvmlGetTemp = (DelNvmlGetTemp)Marshal.GetDelegateForFunctionPointer(pTemp, typeof(DelNvmlGetTemp));
                    if (pShut != IntPtr.Zero) nvmlShutdown = (DelNvmlShutdown)Marshal.GetDelegateForFunctionPointer(pShut, typeof(DelNvmlShutdown));
                }
            }
        } catch {}
    }

    // ---- FrameView SDK
    [StructLayout(LayoutKind.Sequential)]
    struct Samples_v1 {
        public uint version;
        public uint type;
        public UIntPtr mNumSamples;
        public IntPtr mData;
    }
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate IntPtr DelFvQuery(uint id);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate uint DelFvInit();
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate uint DelFvCreateSession(out IntPtr session);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate uint DelFvDestroySession(IntPtr session);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate uint DelFvStartSession(IntPtr session);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate uint DelFvStopSession(IntPtr session);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate uint DelFvEnableMetrics(IntPtr session, uint[] metrics, uint count);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate uint DelFvSampleData(IntPtr session, uint flags);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate uint DelFvReadData(IntPtr session, ref Samples_v1 samples, uint count);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate uint DelFvShutdown();

    static IntPtr hFv = IntPtr.Zero;
    static IntPtr fvSession = IntPtr.Zero;
    static DelFvSampleData fvSample;
    static DelFvReadData fvRead;
    static DelFvStopSession fvStop;
    static DelFvDestroySession fvDestroy;
    static DelFvShutdown fvShutdown;

    static void InitFvSdk() {
        try {
            string[] paths = new string[] {
                @"C:\\Program Files\\NVIDIA Corporation\\FrameViewSDK\\bin\\FvSDK_x64.dll",
                @"C:\\Program Files\\NVIDIA Corporation\\FrameViewSDK\\SDK\\Public_Release\\FvSDK_x64.dll"
            };
            foreach (string p in paths) {
                if (File.Exists(p)) { hFv = LoadLibraryW(p); if (hFv != IntPtr.Zero) break; }
            }
            if (hFv == IntPtr.Zero) return;
            IntPtr pQuery = GetProcAddress(hFv, "fv_QueryInterface");
            if (pQuery == IntPtr.Zero) return;
            var query = (DelFvQuery)Marshal.GetDelegateForFunctionPointer(pQuery, typeof(DelFvQuery));
            IntPtr pInit = query(7), pCreate = query(0), pDestroy = query(1), pEnable = query(2),
                   pSample = query(3), pRead = query(4), pStart = query(5), pStop = query(6), pShut = query(8);
            if (pInit == IntPtr.Zero || pCreate == IntPtr.Zero || pStart == IntPtr.Zero || pEnable == IntPtr.Zero || pSample == IntPtr.Zero || pRead == IntPtr.Zero) return;

            var fnInit = (DelFvInit)Marshal.GetDelegateForFunctionPointer(pInit, typeof(DelFvInit));
            var fnCreate = (DelFvCreateSession)Marshal.GetDelegateForFunctionPointer(pCreate, typeof(DelFvCreateSession));
            var fnStart = (DelFvStartSession)Marshal.GetDelegateForFunctionPointer(pStart, typeof(DelFvStartSession));
            var fnEnable = (DelFvEnableMetrics)Marshal.GetDelegateForFunctionPointer(pEnable, typeof(DelFvEnableMetrics));
            fvSample = (DelFvSampleData)Marshal.GetDelegateForFunctionPointer(pSample, typeof(DelFvSampleData));
            fvRead = (DelFvReadData)Marshal.GetDelegateForFunctionPointer(pRead, typeof(DelFvReadData));
            if (pStop != IntPtr.Zero) fvStop = (DelFvStopSession)Marshal.GetDelegateForFunctionPointer(pStop, typeof(DelFvStopSession));
            if (pDestroy != IntPtr.Zero) fvDestroy = (DelFvDestroySession)Marshal.GetDelegateForFunctionPointer(pDestroy, typeof(DelFvDestroySession));
            if (pShut != IntPtr.Zero) fvShutdown = (DelFvShutdown)Marshal.GetDelegateForFunctionPointer(pShut, typeof(DelFvShutdown));

            if (fnInit() == 0 && fnCreate(out fvSession) == 0 && fvSession != IntPtr.Zero) {
                uint st = fnStart(fvSession);
                if (st == 0 || st == 0x14) {
                    // Enable eAvgFPS, eGPUTemp, eGPUUtil, eCPUPkgTemp, eProcessName
                    uint[] metrics = new uint[] { 0x6C4B1348, 0x0ADD87E5, 0xDFE8B08C, 0xB0CCC37A, 0xA98734CD };
                    fnEnable(fvSession, metrics, (uint)metrics.Length);
                    fvSample(fvSession, 0);
                }
            }
        } catch {}
    }

    // ---- PDH fallback
    static IntPtr pdhQuery = IntPtr.Zero;
    static IntPtr pdhGpu = IntPtr.Zero;
    static IntPtr pdhVram = IntPtr.Zero;
    static IntPtr pdhTherm = IntPtr.Zero;

    static void InitPdh() {
        try {
            if (PdhOpenQueryW(null, IntPtr.Zero, out pdhQuery) == 0) {
                PdhAddEnglishCounterW(pdhQuery, @"\\GPU Engine(*engtype_3D)\\Utilization Percentage", IntPtr.Zero, out pdhGpu);
                PdhAddEnglishCounterW(pdhQuery, @"\\GPU Adapter Memory(*)\\Dedicated Usage", IntPtr.Zero, out pdhVram);
                PdhAddEnglishCounterW(pdhQuery, @"\\Thermal Zone Information(*)\\High Precision Temperature", IntPtr.Zero, out pdhTherm);
                PdhCollectQueryData(pdhQuery);
            }
        } catch {}
    }

    // ---- CPU state
    static ulong lastIdle = 0, lastKernel = 0, lastUser = 0;
    static double GetCpuPercent() {
        FILETIME idleFt, kernelFt, userFt;
        if (!GetSystemTimes(out idleFt, out kernelFt, out userFt)) return -1;
        ulong idle = idleFt.ToUInt64(), kernel = kernelFt.ToUInt64(), user = userFt.ToUInt64();
        ulong dIdle = idle - lastIdle, dKernel = kernel - lastKernel, dUser = user - lastUser;
        lastIdle = idle; lastKernel = kernel; lastUser = user;
        ulong total = dKernel + dUser;
        if (total == 0) return 0;
        double busy = (double)(total - dIdle) / total * 100.0;
        return Math.Max(0.0, Math.Min(100.0, busy));
    }

    static string Num(double v, int dec) {
        if (double.IsNaN(v) || double.IsInfinity(v) || v < 0) return "null";
        return Math.Round(v, dec).ToString(CultureInfo.InvariantCulture);
    }

    static string EscJson(string s) {
        if (s == null) return "";
        return s.Replace("\\\\", "\\\\\\\\").Replace("\\"", "\\\\\\"").Replace("\\r", "").Replace("\\n", "");
    }

    static HashSet<uint> targetPids = new HashSet<uint>();
    static HashSet<uint> ignorePids = new HashSet<uint>();
    static long qpcFreq = 10000000;

    static void PollMetrics() {
        double fps = -1;
        double cpu = GetCpuPercent();
        double gpu = -1;
        double vramMB = -1;
        double vramTotalMB = -1;
        double ramUsedGB = -1;
        double ramTotalGB = -1;
        double cpuTemp = -1;
        double gpuTemp = -1;
        int refreshHz = 60;

        try {
            IntPtr dc = GetDC(IntPtr.Zero);
            if (dc != IntPtr.Zero) {
                int hz = GetDeviceCaps(dc, 116);
                if (hz > 1) refreshHz = hz;
                ReleaseDC(IntPtr.Zero, dc);
            }
        } catch {}

        try {
            MEMORYSTATUSEX mem = new MEMORYSTATUSEX();
            mem.dwLength = (uint)Marshal.SizeOf(typeof(MEMORYSTATUSEX));
            if (GlobalMemoryStatusEx(ref mem) && mem.ullTotalPhys > 0) {
                ramTotalGB = mem.ullTotalPhys / 1073741824.0;
                ramUsedGB = (mem.ullTotalPhys - mem.ullAvailPhys) / 1073741824.0;
            }
        } catch {}

        if (nvmlDevice != IntPtr.Zero) {
            try {
                if (nvmlGetUtil != null) {
                    NvmlUtilization u;
                    if (nvmlGetUtil(nvmlDevice, out u) == 0) gpu = u.gpu;
                }
                if (nvmlGetMem != null) {
                    NvmlMemory m;
                    if (nvmlGetMem(nvmlDevice, out m) == 0) {
                        vramMB = m.used / 1048576.0;
                        vramTotalMB = m.total / 1048576.0;
                    }
                }
                if (nvmlGetTemp != null) {
                    uint t;
                    if (nvmlGetTemp(nvmlDevice, 0, out t) == 0 && t > 0 && t < 130) gpuTemp = t;
                }
            } catch {}
        }

        if (fvSession != IntPtr.Zero && fvSample != null && fvRead != null) {
            try {
                fvSample(fvSession, 0);
                long nowQpc; QueryPerformanceCounter(out nowQpc);

                Dictionary<uint, string> procNames = new Dictionary<uint, string>();
                Samples_v1 smpP = new Samples_v1 { version = (uint)(Marshal.SizeOf(typeof(Samples_v1)) | (1 << 16)), type = 0xA98734CD };
                fvRead(fvSession, ref smpP, 1);
                int np = (int)smpP.mNumSamples;
                if (np > 0 && np < 256) {
                    IntPtr bp = Marshal.AllocHGlobal(np * 288);
                    for (int b = 0; b < np * 288; b++) Marshal.WriteByte(bp, b, 0);
                    for (int i = 0; i < np; i++) {
                        Marshal.WriteInt32(bp, i * 288 + 0, 16 | (1 << 16));
                        Marshal.WriteInt32(bp, i * 288 + 16, 288 | (1 << 16));
                    }
                    smpP.mData = bp;
                    if (fvRead(fvSession, ref smpP, 1) == 0) {
                        for (int i = 0; i < np; i++) {
                            uint pid = (uint)Marshal.ReadInt64(bp, i * 288 + 24);
                            string name = Marshal.PtrToStringAnsi(IntPtr.Add(bp, i * 288 + 32));
                            if (pid > 0 && !string.IsNullOrEmpty(name)) procNames[pid] = name.ToLowerInvariant();
                        }
                    }
                    Marshal.FreeHGlobal(bp);
                }

                Samples_v1 smpF = new Samples_v1 { version = (uint)(Marshal.SizeOf(typeof(Samples_v1)) | (1 << 16)), type = 0x6C4B1348 };
                fvRead(fvSession, ref smpF, 1);
                int nf = (int)smpF.mNumSamples;
                if (nf > 0 && nf < 256) {
                    IntPtr bf = Marshal.AllocHGlobal(nf * 56);
                    for (int b = 0; b < nf * 56; b++) Marshal.WriteByte(bf, b, 0);
                    for (int i = 0; i < nf; i++) {
                        Marshal.WriteInt32(bf, i * 56 + 0, 16 | (1 << 16));
                        Marshal.WriteInt32(bf, i * 56 + 16, 56 | (1 << 16));
                        Marshal.WriteInt32(bf, i * 56 + 24, 32 | (1 << 16));
                    }
                    smpF.mData = bf;
                    if (fvRead(fvSession, ref smpF, 1) == 0) {
                        uint fgPid = 0;
                        IntPtr fgWin = GetForegroundWindow();
                        if (fgWin != IntPtr.Zero) GetWindowThreadProcessId(fgWin, out fgPid);

                        double targetFps = -1;
                        double fgFps = -1;
                        double otherGameFps = -1;

                        for (int i = 0; i < nf; i++) {
                            long ts = Marshal.ReadInt64(bf, i * 56 + 8);
                            uint pid = (uint)Marshal.ReadInt64(bf, i * 56 + 32);
                            ulong sc = (ulong)Marshal.ReadInt64(bf, i * 56 + 40);
                            double val = BitConverter.Int64BitsToDouble(Marshal.ReadInt64(bf, i * 56 + 48));

                            if (sc == 0 || val <= 0 || val > 5000) continue;
                            if (qpcFreq > 0 && ts > 0 && (nowQpc - ts) > qpcFreq * 2.5) continue;
                            if (ignorePids.Contains(pid)) continue;

                            string pname = procNames.ContainsKey(pid) ? procNames[pid] : "";
                            if (pname == "dwm.exe" || pname == "explorer.exe" || pname == "searchhost.exe" ||
                                pname == "shellexperiencehost.exe" || pname == "startmenuexperiencehost.exe" ||
                                pname == "applicationframehost.exe" || pname == "textinputhost.exe" ||
                                pname == "systemsettings.exe" || pname == "lockapp.exe" ||
                                pname == "electron.exe" || pname == "ember launcher.exe") {
                                continue;
                            }

                            if (targetPids.Contains(pid)) {
                                if (val > targetFps) targetFps = val;
                            } else if (fgPid > 0 && pid == fgPid && targetPids.Count == 0) {
                                if (!pname.Contains("code") && !pname.Contains("antigravity") && !pname.Contains("chrome") &&
                                    !pname.Contains("msedge") && !pname.Contains("firefox") && !pname.Contains("discord")) {
                                    if (val > fgFps) fgFps = val;
                                }
                            } else if (targetPids.Count > 0 && fgPid == pid) {
                                if (val > otherGameFps) otherGameFps = val;
                            }
                        }

                        if (targetFps > 0) fps = targetFps;
                        else if (otherGameFps > 0) fps = otherGameFps;
                        else if (fgFps > 0) fps = fgFps;
                    }
                    Marshal.FreeHGlobal(bf);
                }

                Samples_v1 smpCT = new Samples_v1 { version = (uint)(Marshal.SizeOf(typeof(Samples_v1)) | (1 << 16)), type = 0xB0CCC37A };
                fvRead(fvSession, ref smpCT, 1);
                int nct = (int)smpCT.mNumSamples;
                if (nct > 0 && nct < 64) {
                    IntPtr bct = Marshal.AllocHGlobal(nct * 32);
                    for (int b = 0; b < nct * 32; b++) Marshal.WriteByte(bct, b, 0);
                    for (int i = 0; i < nct; i++) {
                        Marshal.WriteInt32(bct, i * 32 + 0, 16 | (1 << 16));
                        Marshal.WriteInt32(bct, i * 32 + 16, 32 | (1 << 16));
                    }
                    smpCT.mData = bct;
                    if (fvRead(fvSession, ref smpCT, 1) == 0) {
                        double t = BitConverter.Int64BitsToDouble(Marshal.ReadInt64(bct, (nct - 1) * 32 + 24));
                        if (t > 0 && t < 130) cpuTemp = t;
                    }
                    Marshal.FreeHGlobal(bct);
                }

                if (gpuTemp < 0) {
                    Samples_v1 smpGT = new Samples_v1 { version = (uint)(Marshal.SizeOf(typeof(Samples_v1)) | (1 << 16)), type = 0x0ADD87E5 };
                    fvRead(fvSession, ref smpGT, 1);
                    int ngt = (int)smpGT.mNumSamples;
                    if (ngt > 0 && ngt < 64) {
                        IntPtr bgt = Marshal.AllocHGlobal(ngt * 40);
                        for (int b = 0; b < ngt * 40; b++) Marshal.WriteByte(bgt, b, 0);
                        for (int i = 0; i < ngt; i++) {
                            Marshal.WriteInt32(bgt, i * 40 + 0, 16 | (1 << 16));
                            Marshal.WriteInt32(bgt, i * 40 + 16, 40 | (1 << 16));
                        }
                        smpGT.mData = bgt;
                        if (fvRead(fvSession, ref smpGT, 1) == 0) {
                            double t = BitConverter.Int64BitsToDouble(Marshal.ReadInt64(bgt, (ngt - 1) * 40 + 32));
                            if (t > 0 && t < 130) gpuTemp = t;
                        }
                        Marshal.FreeHGlobal(bgt);
                    }
                }
            } catch {}
        }

        if ((gpu < 0 || vramMB < 0 || cpuTemp < 0) && pdhQuery != IntPtr.Zero) {
            try {
                PdhCollectQueryData(pdhQuery);
                if (gpu < 0 && pdhGpu != IntPtr.Zero) {
                    uint sz = 0, cnt = 0;
                    PdhGetFormattedCounterArrayW(pdhGpu, 0x00000200, ref sz, out cnt, IntPtr.Zero);
                    if (sz > 0) {
                        IntPtr buf = Marshal.AllocHGlobal((int)sz);
                        if (PdhGetFormattedCounterArrayW(pdhGpu, 0x00000200, ref sz, out cnt, buf) == 0) {
                            double sum = 0;
                            for (int i = 0; i < cnt; i++) {
                                double v = BitConverter.Int64BitsToDouble(Marshal.ReadInt64(buf, i * 24 + 16));
                                if (v > 0) sum += v;
                            }
                            gpu = Math.Min(100.0, sum);
                        }
                        Marshal.FreeHGlobal(buf);
                    }
                }
                if (vramMB < 0 && pdhVram != IntPtr.Zero) {
                    uint sz = 0, cnt = 0;
                    PdhGetFormattedCounterArrayW(pdhVram, 0x00000400, ref sz, out cnt, IntPtr.Zero);
                    if (sz > 0) {
                        IntPtr buf = Marshal.AllocHGlobal((int)sz);
                        if (PdhGetFormattedCounterArrayW(pdhVram, 0x00000400, ref sz, out cnt, buf) == 0) {
                            long maxV = 0;
                            for (int i = 0; i < cnt; i++) {
                                long v = Marshal.ReadInt64(buf, i * 24 + 16);
                                if (v > maxV) maxV = v;
                            }
                            if (maxV > 0) vramMB = maxV / 1048576.0;
                        }
                        Marshal.FreeHGlobal(buf);
                    }
                }
                if (cpuTemp < 0 && pdhTherm != IntPtr.Zero) {
                    uint sz = 0, cnt = 0;
                    PdhGetFormattedCounterArrayW(pdhTherm, 0x00000200, ref sz, out cnt, IntPtr.Zero);
                    if (sz > 0) {
                        IntPtr buf = Marshal.AllocHGlobal((int)sz);
                        if (PdhGetFormattedCounterArrayW(pdhTherm, 0x00000200, ref sz, out cnt, buf) == 0) {
                            double maxK = 0;
                            for (int i = 0; i < cnt; i++) {
                                double v = BitConverter.Int64BitsToDouble(Marshal.ReadInt64(buf, i * 24 + 16));
                                if (v > maxK) maxK = v;
                            }
                            if (maxK > 2732) {
                                double c = (maxK / 10.0) - 273.15;
                                if (c > 0 && c < 130) cpuTemp = c;
                            }
                        }
                        Marshal.FreeHGlobal(buf);
                    }
                }
            } catch {}
        }

        double vramPct = (vramMB >= 0 && vramTotalMB > 0) ? Math.Min(100.0, Math.Round(vramMB / vramTotalMB * 100.0)) : -1;
        double ramPct = (ramUsedGB >= 0 && ramTotalGB > 0) ? Math.Min(100.0, Math.Round(ramUsedGB / ramTotalGB * 100.0)) : -1;

        StringBuilder sb = new StringBuilder(256);
        sb.Append("{\\"type\\":\\"metrics\\"");
        sb.Append(",\\"fps\\":").Append(Num(fps, 0));
        sb.Append(",\\"refreshHz\\":").Append(refreshHz);
        sb.Append(",\\"cpu\\":").Append(Num(cpu, 1));
        sb.Append(",\\"gpu\\":").Append(Num(gpu, 1));
        sb.Append(",\\"vramMB\\":").Append(Num(vramMB, 1));
        sb.Append(",\\"vramPct\\":").Append(Num(vramPct, 0));
        sb.Append(",\\"ramUsedGB\\":").Append(Num(ramUsedGB, 2));
        sb.Append(",\\"ramTotalGB\\":").Append(Num(ramTotalGB, 2));
        sb.Append(",\\"ramPct\\":").Append(Num(ramPct, 0));
        sb.Append(",\\"cpuTemp\\":").Append(Num(cpuTemp, 1));
        sb.Append(",\\"gpuTemp\\":").Append(Num(gpuTemp, 1));
        sb.Append("}");
        Console.WriteLine(sb.ToString());
        Console.Out.Flush();
    }

    static void ScanProcesses() {
        StringBuilder sb = new StringBuilder(16384);
        sb.Append("{\\"type\\":\\"procs\\",\\"list\\":[");
        bool first = true;
        IntPtr snap = CreateToolhelp32Snapshot(0x00000002, 0);
        if (snap != IntPtr.Zero && snap != new IntPtr(-1)) {
            PROCESSENTRY32W pe = new PROCESSENTRY32W();
            pe.dwSize = (uint)Marshal.SizeOf(typeof(PROCESSENTRY32W));
            StringBuilder pathBuf = new StringBuilder(1024);
            if (Process32FirstW(snap, ref pe)) {
                do {
                    string fullPath = "";
                    IntPtr h = OpenProcess(0x1000, false, pe.th32ProcessID);
                    if (h != IntPtr.Zero) {
                        int cap = pathBuf.Capacity;
                        if (QueryFullProcessImageNameW(h, 0, pathBuf, ref cap)) {
                            fullPath = pathBuf.ToString(0, cap).ToLowerInvariant();
                        }
                        CloseHandle(h);
                    }
                    if (string.IsNullOrEmpty(fullPath) && !string.IsNullOrEmpty(pe.szExeFile)) {
                        fullPath = pe.szExeFile.ToLowerInvariant();
                    }
                    if (!string.IsNullOrEmpty(fullPath)) {
                        if (!first) sb.Append(",");
                        first = false;
                        sb.Append("[").Append(pe.th32ProcessID).Append(",\\"").Append(EscJson(fullPath)).Append("\\"]");
                    }
                } while (Process32NextW(snap, ref pe));
            }
            CloseHandle(snap);
        }
        sb.Append("]}");
        Console.WriteLine(sb.ToString());
        Console.Out.Flush();
    }

    static void Main(string[] args) {
        Console.OutputEncoding = Encoding.UTF8;
        QueryPerformanceFrequency(out qpcFreq);
        ignorePids.Add(GetCurrentProcessId());
        for (int i = 0; i < args.Length; i++) {
            uint p;
            if (uint.TryParse(args[i], out p) && p > 0) ignorePids.Add(p);
        }
        GetCpuPercent();
        InitNvml();
        InitFvSdk();
        InitPdh();

        string line;
        while ((line = Console.ReadLine()) != null) {
            line = line.Trim();
            if (line == "poll") {
                PollMetrics();
            } else if (line == "scan") {
                ScanProcesses();
            } else if (line.StartsWith("pids:")) {
                targetPids.Clear();
                string[] parts = line.Substring(5).Split(new char[] { ',' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (string pt in parts) {
                    uint p;
                    if (uint.TryParse(pt.Trim(), out p) && p > 0) targetPids.Add(p);
                }
            } else if (line == "quit") {
                break;
            }
        }

        if (fvStop != null && fvSession != IntPtr.Zero) fvStop(fvSession);
        if (fvDestroy != null && fvSession != IntPtr.Zero) fvDestroy(fvSession);
        if (fvShutdown != null) fvShutdown();
        if (nvmlShutdown != null && nvmlDevice != IntPtr.Zero) nvmlShutdown();
        if (pdhQuery != IntPtr.Zero) PdhCloseQuery(pdhQuery);
    }
}
`;

let perfDaemon = null;
let perfDaemonReady = null;
let perfDaemonBuf = '';
let pendingMetricReqs = [];
let pendingScanReqs = [];
let lastSentTargetPids = '';

function ensurePerfDaemon() {
  if (perfDaemon && !perfDaemon.killed) return Promise.resolve(perfDaemon);
  if (perfDaemonReady) return perfDaemonReady;

  perfDaemonReady = new Promise(resolve => {
    const dir = app.getPath('userData');
    const exePath = path.join(dir, `EmberPerfHelper-v${HELPER_VERSION}.exe`);
    const csPath = path.join(dir, `EmberPerfHelper-v${HELPER_VERSION}.cs`);
    const cscPath = path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');

    const startProc = () => {
      if (!fs.existsSync(exePath)) { perfDaemonReady = null; return resolve(null); }
      try {
        const child = spawn(exePath, [String(process.pid)], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
        perfDaemon = child;
        perfDaemonBuf = '';
        lastSentTargetPids = '';
        child.stdout.on('data', chunk => {
          perfDaemonBuf += chunk.toString('utf8');
          let idx;
          while ((idx = perfDaemonBuf.indexOf('\n')) !== -1) {
            const line = perfDaemonBuf.slice(0, idx).trim();
            perfDaemonBuf = perfDaemonBuf.slice(idx + 1);
            if (!line) continue;
            try {
              const msg = JSON.parse(line);
              if (msg.type === 'metrics') {
                const waiters = pendingMetricReqs.splice(0);
                for (const w of waiters) w(msg);
              } else if (msg.type === 'procs') {
                const waiters = pendingScanReqs.splice(0);
                for (const w of waiters) w(msg.list || []);
              }
            } catch {}
          }
        });
        child.on('exit', () => {
          if (perfDaemon === child) { perfDaemon = null; perfDaemonReady = null; }
          for (const w of pendingMetricReqs.splice(0)) w(null);
          for (const w of pendingScanReqs.splice(0)) w(null);
        });
        child.on('error', () => {
          if (perfDaemon === child) { perfDaemon = null; perfDaemonReady = null; }
          for (const w of pendingMetricReqs.splice(0)) w(null);
          for (const w of pendingScanReqs.splice(0)) w(null);
        });
        resolve(child);
      } catch {
        perfDaemonReady = null;
        resolve(null);
      }
    };

    if (fs.existsSync(exePath)) return startProc();
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(csPath, HELPER_CS_SOURCE, 'utf8');
      execFile(cscPath, ['/nologo', '/optimize+', `/out:${exePath}`, csPath], { windowsHide: true, timeout: 15000 }, () => {
        try { fs.unlinkSync(csPath); } catch {}
        startProc();
      });
    } catch {
      perfDaemonReady = null;
      resolve(null);
    }
  });
  return perfDaemonReady;
}

function stopPerfDaemon() {
  if (perfDaemon && !perfDaemon.killed) {
    try { perfDaemon.stdin.write('quit\n'); } catch {}
    try { perfDaemon.kill(); } catch {}
  }
  perfDaemon = null;
  perfDaemonReady = null;
}

function syncTargetPidsToDaemon() {
  if (!perfDaemon || perfDaemon.killed) return;
  const pids = new Set();
  for (const st of active.values()) {
    if (st.pids) for (const p of st.pids) pids.add(p);
  }
  const key = [...pids].sort((a, b) => a - b).join(',');
  if (key !== lastSentTargetPids) {
    lastSentTargetPids = key;
    try { perfDaemon.stdin.write(`pids:${key}\n`); } catch {}
  }
}

async function pollMetrics() {
  const daemon = await ensurePerfDaemon();
  if (daemon && !daemon.killed) {
    syncTargetPidsToDaemon();
    return new Promise(res => {
      const timer = setTimeout(() => {
        const i = pendingMetricReqs.indexOf(done);
        if (i !== -1) pendingMetricReqs.splice(i, 1);
        res(null);
      }, 2000);
      const done = data => { clearTimeout(timer); res(data); };
      pendingMetricReqs.push(done);
      try { daemon.stdin.write('poll\n'); } catch { clearTimeout(timer); res(null); }
    });
  }
  return null;
}

let pollBusy = false;
function startPerfPolling() {
  if (perfTimer) return;
  const runPoll = async () => {
    if (pollBusy || !overlayWin || overlayWin.isDestroyed() || !overlayWin.isVisible()) return;
    pollBusy = true;
    try {
      const data = await pollMetrics();
      if (!data) return;
      if (data.ramUsedGB != null && data.ramTotalGB && data.ramPct == null) {
        data.ramPct = Math.round(data.ramUsedGB / data.ramTotalGB * 100);
      }
      data.settings = overlaySettings;
      if (overlayWin && !overlayWin.isDestroyed() && overlayWin.isVisible()) {
        overlayWin.webContents.send('metrics', data);
      }
    } finally {
      pollBusy = false;
    }
  };
  runPoll();
  perfTimer = setInterval(runPoll, 1000);
}

function stopPerfPolling() {
  if (perfTimer) { clearInterval(perfTimer); perfTimer = null; }
}

function computeOverlayPosition(w, h) {
  const display = screen.getPrimaryDisplay();
  const wa = display.workArea;
  const margin = 16;
  const pos = overlaySettings.position || 'top-right';
  let x, y;
  if (pos === 'custom' && overlaySettings.customX != null && overlaySettings.customY != null) {
    x = overlaySettings.customX;
    y = overlaySettings.customY;
  } else if (pos === 'top-left') {
    x = wa.x + margin;
    y = wa.y + margin;
  } else if (pos === 'bottom-left') {
    x = wa.x + margin;
    y = wa.y + wa.height - h - margin;
  } else if (pos === 'bottom-right') {
    x = wa.x + wa.width - w - margin;
    y = wa.y + wa.height - h - margin;
  } else {
    // top-right default
    x = wa.x + wa.width - w - margin;
    y = wa.y + margin;
  }
  // Keep within visible screen bounds
  const minX = wa.x;
  const minY = wa.y;
  const maxX = Math.max(minX, wa.x + wa.width - w);
  const maxY = Math.max(minY, wa.y + wa.height - h);
  x = Math.max(minX, Math.min(maxX, Math.round(x)));
  y = Math.max(minY, Math.min(maxY, Math.round(y)));
  return { x, y };
}

function applyOverlayBounds(w = overlayBounds.width, h = overlayBounds.height) {
  overlayBounds = { width: Math.max(80, Math.ceil(w)), height: Math.max(40, Math.ceil(h)) };
  if (!overlayWin || overlayWin.isDestroyed()) return;
  const { x, y } = computeOverlayPosition(overlayBounds.width, overlayBounds.height);
  overlayWin.setBounds({ x, y, width: overlayBounds.width, height: overlayBounds.height });
}

function createOverlayWin() {
  const { x, y } = computeOverlayPosition(overlayBounds.width, overlayBounds.height);
  overlayWin = new BrowserWindow({
    width: overlayBounds.width, height: overlayBounds.height,
    x, y,
    transparent: true, frame: false, hasShadow: false,
    alwaysOnTop: true, skipTaskbar: true,
    focusable: false, show: false,
    resizable: false, movable: true,
    webPreferences: {
      preload: path.join(__dirname, 'renderer', 'overlay-preload.js'),
      contextIsolation: true, sandbox: true
    }
  });
  overlayWin.setAlwaysOnTop(true, 'screen-saver');
  overlayWin.setIgnoreMouseEvents(true, { forward: true });
  overlayWin.loadFile('renderer/overlay.html');
  overlayWin.webContents.on('did-finish-load', () => {
    if (!overlayWin || overlayWin.isDestroyed()) return;
    overlayWin.webContents.send('settings', overlaySettings);
    if (overlaySettings.enabled) {
      overlayShowIfEnabled();
    }
  });
  overlayWin.on('closed', () => { overlayWin = null; });
}

function overlayShowIfEnabled() {
  if (!overlayWin || overlayWin.isDestroyed()) return;
  if (overlaySettings.enabled) {
    applyOverlayBounds();
    overlayWin.setAlwaysOnTop(true, 'screen-saver');
    overlayWin.showInactive();
    startPerfPolling();
  }
}

function overlayHide() {
  if (!overlayWin || overlayWin.isDestroyed()) return;
  overlayWin.hide();
  stopPerfPolling();
}

// ---- Background mode: keep running in the system tray after the window is closed
const APP_SETTINGS_PATH = () => path.join(app.getPath('userData'), 'app-settings.json');
let appSettings = { background: true, launchAtStartup: false, showStartupMessage: true }, tray = null, quitting = false;
function loadAppSettings() { try { appSettings = { ...appSettings, ...JSON.parse(fs.readFileSync(APP_SETTINGS_PATH(), 'utf8')) }; } catch {} }
function saveAppSettings() { try { fs.writeFileSync(APP_SETTINGS_PATH(), JSON.stringify(appSettings, null, 2)); } catch {} }
const LOGO = path.join(__dirname, 'renderer', 'assets', 'ember-logo.png');
function trayIcon() { // the real Ember logo; falls back to a flame-coloured dot drawn in code (BGRA) if the file is missing
  const logo = nativeImage.createFromPath(LOGO);
  if (!logo.isEmpty()) return logo.resize({ width: 32, height: 32, quality: 'best' });
  const n = 32, buf = Buffer.alloc(n * n * 4), c = (n - 1) / 2;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const d = Math.hypot(x - c, y - c), a = Math.max(0, Math.min(1, c - d + 0.5)), t = (x + y) / (2 * n), i = (y * n + x) * 4;
    buf[i] = 255 * (1 - t) + 162 * t; buf[i + 1] = 108 * (1 - t) + 95 * t; buf[i + 2] = 124 * (1 - t) + 255 * t; buf[i + 3] = Math.round(255 * a); // B,G,R,A: purple -> pink
  }
  return nativeImage.createFromBitmap(buf, { width: n, height: n });
}
function showMain() { if (!win || win.isDestroyed()) return; if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
// ---- Launch when Windows starts (per-user Run registry entry via Electron's login item API)
const HIDDEN_ARG = '--hidden';
const startedHidden = process.argv.includes(HIDDEN_ARG);
function loginOpts() {
  // Portable builds run from a temp folder; register the real portable exe. Dev runs need the app path as an argument.
  const exe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  const args = app.isPackaged ? [HIDDEN_ARG] : [app.getAppPath(), HIDDEN_ARG];
  return { path: exe, args };
}
function startupEnabled() { try { return !!app.getLoginItemSettings(loginOpts()).openAtLogin; } catch { return false; } }
function setStartup(on) {
  try { app.setLoginItemSettings({ ...loginOpts(), openAtLogin: !!on }); } catch {}
  return startupEnabled();
}
function currentAppSettings() { return { ...appSettings, launchAtStartup: startupEnabled() }; }
// ---- Startup welcome: a small, non-interactive toast shown once per Windows session on auto-start
const welcome = require('./welcome.js');
const WELCOME_STATE = () => path.join(app.getPath('userData'), 'welcome-state.json');
function showWelcomeWindow(text) {
  const wa = screen.getPrimaryDisplay().workArea, w = 340, hgt = 100;
  const ww = new BrowserWindow({
    width: w, height: hgt, x: wa.x + wa.width - w - 12, y: wa.y + wa.height - hgt - 12,
    frame: false, transparent: true, resizable: false, movable: false, minimizable: false, maximizable: false,
    skipTaskbar: true, focusable: false, show: false, hasShadow: false, alwaysOnTop: true,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false }
  });
  ww.setIgnoreMouseEvents(true); // clicks pass straight through to whatever is underneath
  ww.loadFile(path.join(__dirname, 'renderer', 'welcome.html'), { hash: encodeURIComponent(text) });
  ww.once('ready-to-show', () => {
    if (ww.isDestroyed()) return;
    ww.showInactive(); // never takes keyboard focus
    setTimeout(() => { if (!ww.isDestroyed()) ww.webContents.executeJavaScript('window.fadeOut()').catch(() => {}); }, 5000);
    setTimeout(() => { if (!ww.isDestroyed()) ww.close(); }, 6200);
  });
  ww.on('closed', () => {});
}
function maybeShowWelcome() {
  if (!startedHidden || !appSettings.showStartupMessage) return;
  welcome.querySession(({ key, busy }) => {
    if (quitting || busy || active.size) return; // don't disturb fullscreen games / presentations / running games
    if (!welcome.claimSession(WELCOME_STATE(), key)) return; // already shown in this Windows session
    showWelcomeWindow(welcome.pickMessage());
  });
}
function applyTray() {
  if (appSettings.background && !tray) {
    tray = new Tray(trayIcon()); tray.setToolTip('Ember Launcher');
    tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Open Ember', click: showMain }, { type: 'separator' }, { label: 'Quit Ember', click: () => app.quit() }]));
    tray.on('click', showMain);
  } else if (!appSettings.background && tray) { tray.destroy(); tray = null; }
}

function initDb() {
  db = new DatabaseSync(path.join(app.getPath('userData'), 'launcher.db'));
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS games(id INTEGER PRIMARY KEY, name TEXT NOT NULL, exe TEXT NOT NULL,
      args TEXT DEFAULT '', emulator TEXT DEFAULT '', cover TEXT DEFAULT '', track TEXT DEFAULT '',
      grp TEXT DEFAULT '', added INTEGER);
    CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY, game_id INTEGER NOT NULL,
      started INTEGER NOT NULL, ended INTEGER, beat INTEGER);
    CREATE INDEX IF NOT EXISTS s_game ON sessions(game_id);`);
  // Backward-compatible migration: Windows (AUMID) apps. Existing rows get '' = classic exe/emulator launch.
  const cols = db.prepare('PRAGMA table_info(games)').all().map(c => c.name);
  if (!cols.includes('aumid')) db.exec("ALTER TABLE games ADD COLUMN aumid TEXT DEFAULT ''");
  if (!cols.includes('method')) db.exec("ALTER TABLE games ADD COLUMN method TEXT DEFAULT ''");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS g_aumid ON games(aumid) WHERE aumid<>''"); // no duplicate imports
  // Crash recovery: sessions left open are closed at their last heartbeat.
  db.prepare('UPDATE sessions SET ended=MAX(started,COALESCE(beat,started)) WHERE ended IS NULL').run();
}
const all = (sql, ...p) => JSON.parse(JSON.stringify(db.prepare(sql).all(...p)));
const send = (ch, ...a) => { if (win && !win.isDestroyed()) win.webContents.send(ch, ...a); };

// Lists [pid, executablePath] of every running process (uses fast native Toolhelp32 helper, with PowerShell fallback).
const scan = async () => {
  const daemon = await ensurePerfDaemon();
  if (daemon && !daemon.killed) {
    const res = await new Promise(resolve => {
      const timer = setTimeout(() => {
        const i = pendingScanReqs.indexOf(done);
        if (i !== -1) pendingScanReqs.splice(i, 1);
        resolve(null);
      }, 2500);
      const done = list => { clearTimeout(timer); resolve(list); };
      pendingScanReqs.push(done);
      try { daemon.stdin.write('scan\n'); } catch { clearTimeout(timer); resolve(null); }
    });
    if (Array.isArray(res) && res.length > 0) return res;
  }
  return new Promise(res => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    'Get-CimInstance Win32_Process -Property ProcessId,ExecutablePath | Where-Object ExecutablePath | ForEach-Object { "$($_.ProcessId)|$($_.ExecutablePath)" }'],
    { windowsHide: true, maxBuffer: 1 << 25 },
    (e, out) => res(e ? null : out.split(/\r?\n/).filter(Boolean).map(line => {
      const idx = line.indexOf('|');
      return idx > 0 ? [Number(line.slice(0, idx)) || 0, line.slice(idx + 1).toLowerCase()] : [0, line.toLowerCase()];
    }))));
};

// A process belongs to the game if it is: the emulator exe, anything in the game's folder
// (covers launcher -> game hand-offs), or the optional "process to track" name.
function matcher(g) {
  const exe = (g.emulator || g.exe).toLowerCase(), dir = path.dirname(exe) + path.sep;
  const t = g.track.trim().toLowerCase();
  return p => p === exe || (!g.emulator && p.startsWith(dir)) || (t && path.basename(p) === t);
}

// ---- Windows (Start menu) applications, launched through their registered AppID (AUMID)
const pending = new Set(); // games whose AUMID launch is still being prepared (blocks double clicks)
let startIds = null, startIdsAt = 0, startBusy = false; // cache of registered AppIDs, used to flag uninstalled apps
const validAumid = s => typeof s === 'string' && s.length > 0 && s.length <= 512 && /^[^\x00-\x1f"<>|*?]+$/.test(s);
const ps = (script, env) => new Promise(res => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
  "[Console]::OutputEncoding=[Text.Encoding]::UTF8;$ErrorActionPreference='Stop';" + script],
  { windowsHide: true, maxBuffer: 1 << 25, timeout: 30000, env: { ...process.env, ...env } }, (e, out, err) => res({ e, out: out || '', err: err || '' })));

async function listStartApps() {
  const { e, out, err } = await ps('Get-StartApps | Select-Object Name,AppID | ConvertTo-Json -Compress');
  if (e) {
    const m = String(err || e.message);
    return { ok: false, error: e.killed ? 'Windows took too long to list applications. Please try again.'
      : /not recognized|CommandNotFound/i.test(m) ? "Get-StartApps isn't available on this version of Windows."
      : 'Could not read the Windows application list: ' + m.split(/\r?\n/).find(Boolean)?.slice(0, 160) };
  }
  let j = [];
  try { if (out.trim()) j = JSON.parse(out); } catch { return { ok: false, error: 'Could not understand the Windows application list.' }; }
  const seen = new Map(); // Get-StartApps returns a bare object (not an array) when there is a single result
  for (const a of Array.isArray(j) ? j : [j]) {
    const name = String(a?.Name ?? '').trim(), aumid = String(a?.AppID ?? '').trim();
    if (name && validAumid(aumid) && !seen.has(aumid.toLowerCase())) seen.set(aumid.toLowerCase(), { name, aumid });
  }
  const apps = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  startIds = new Set(apps.map(a => a.aumid.toLowerCase())); startIdsAt = Date.now();
  return { ok: true, apps };
}
function refreshStartIds() { // throttled background refresh so uninstalled apps get flagged in the library
  if (startBusy || Date.now() - startIdsAt < 3e5 || !db.prepare("SELECT 1 FROM games WHERE method='aumid' LIMIT 1").get()) return;
  startBusy = true; listStartApps().finally(() => { startBusy = false; startIdsAt = Date.now(); });
}
// Matches processes that live in the app's package folder (the real game, not the explorer.exe that activated it),
// plus the optional "process to track" name (needed for desktop-style AppIDs, which have no package folder).
function aumidMatcher(g, locs) {
  const dirs = locs.map(l => l.toLowerCase().replace(/[\\/]+$/, '') + path.sep), t = (g.track || '').trim().toLowerCase();
  return p => dirs.some(d => p.startsWith(d)) || (!!t && path.basename(p) === t);
}
async function launchAumid(g) {
  if (pending.has(g.id)) return { ok: true };
  pending.add(g.id);
  try {
    // One lookup: is the AppID still registered, and where is the package installed (the folder changes on updates).
    const r = await ps("$ErrorActionPreference='SilentlyContinue';$id=$env:EMBER_AUMID;$r=@{found=$false;loc=@()};"
      + 'if(Get-StartApps | Where-Object {$_.AppID -eq $id}){$r.found=$true};'
      + "if($id.Contains('!')){$f=$id.Split('!')[0];$r.loc=@(Get-AppxPackage -Name $f.Split('_')[0] | Where-Object {$_.PackageFamilyName -eq $f} | ForEach-Object {$_.InstallLocation})};"
      + '$r | ConvertTo-Json -Compress', { EMBER_AUMID: g.aumid });
    let info = null;
    try { info = JSON.parse(r.out.trim()); } catch {}
    if (info && info.found === false)
      return { ok: false, error: `${g.name} is no longer registered in the Windows Start menu. It may have been uninstalled. Remove it, or import it again after reinstalling.` };
    if (active.has(g.id)) return { ok: true };
    const locs = [].concat(info?.loc || []).filter(l => typeof l === 'string' && l);
    let child;
    try { child = spawn('explorer.exe', ['shell:AppsFolder\\' + g.aumid], { detached: true, stdio: 'ignore' }); }
    catch (e) { return { ok: false, error: `Windows could not start ${g.name}: ${e.message}` }; }
    // explorer.exe often exits with code 1 even when activation worked, so only a spawn failure counts here;
    // if the game never appears, the session is discarded with a clear message (see tick).
    child.on('error', e => finish(g.id, true, `Windows could not start ${g.name}: ${e.message}`));
    return startSession(g.id, g, '', aumidMatcher(g, locs), child);
  } finally { pending.delete(g.id); }
}

function startSession(id, g, exeKey, match, child) {
  const childPid = child && child.pid ? Number(child.pid) : 0;
  child.unref();
  const now = Date.now();
  const sid = Number(db.prepare('INSERT INTO sessions(game_id,started,beat) VALUES(?,?,?)').run(id, now, now).lastInsertRowid);
  const pids = new Set();
  if (childPid > 0 && g.method !== 'aumid') pids.add(childPid);
  const st = { sid, started: now, last: now, seen: false, busy: false, exe: exeKey, match, aumid: g.method === 'aumid', pids };
  st.timer = setInterval(() => tick(id), POLL);
  active.set(id, st);
  syncTargetPidsToDaemon();
  setTimeout(() => tick(id), 1500);
  send('run');
  overlayShowIfEnabled(); // auto-show overlay if enabled
  return { ok: true };
}

function launch(id) {
  const g = db.prepare('SELECT * FROM games WHERE id=?').get(id);
  if (!g) return { ok: false, error: 'Game not found.' };
  if (active.has(id)) return { ok: true };
  if (g.method === 'aumid') return launchAumid(g);
  const exe = g.emulator || g.exe;
  if (!fs.existsSync(exe) || (g.emulator && !fs.existsSync(g.exe)))
    return { ok: false, error: `${g.name}'s files were not found. It may be uninstalled. Edit the game to point to its new location; your playtime is kept.` };
  if (g.emulator && [...active.values()].some(s => s.exe === exe.toLowerCase()))
    return { ok: false, error: 'Another game is already running in this emulator.' };
  const argv = (g.args.match(/"[^"]*"|\S+/g) || []).map(s => s.replace(/^"|"$/g, ''));
  if (g.emulator) argv.push(g.exe); // ROM / disc image goes to the emulator
  let child;
  try { child = spawn(exe, argv, { cwd: path.dirname(exe), detached: true, stdio: 'ignore' }); }
  catch (e) { return { ok: false, error: e.message }; }
  child.on('error', e => finish(id, true, `Could not start ${g.name}: ${e.message}. If it needs admin rights, run Ember as administrator.`));
  return startSession(id, g, exe.toLowerCase(), matcher(g), child);
}

async function tick(id) {
  const st = active.get(id);
  if (!st || st.busy) return;
  st.busy = true;
  const procs = await scan();
  st.busy = false;
  if (!active.has(id) || !procs) return; // a failed scan never ends a session
  const now = Date.now();
  const matchedPids = [];
  for (const item of procs) {
    const pid = Array.isArray(item) ? item[0] : 0;
    const p = Array.isArray(item) ? item[1] : item;
    if (p && st.match(p)) {
      if (pid > 0) matchedPids.push(pid);
      else matchedPids.push(0);
    }
  }
  if (matchedPids.length > 0) {
    st.seen = true; st.last = now;
    st.pids = new Set(matchedPids.filter(p => p > 0));
    syncTargetPidsToDaemon();
    db.prepare('UPDATE sessions SET beat=? WHERE id=?').run(now, st.sid); // heartbeat
  } else if (st.seen && now - st.last >= GRACE) finish(id);
  else if (!st.seen && now - st.started > NOSHOW)
    finish(id, true, st.aumid
      ? 'Ember could not detect this Windows app running. It may not support launching this way, or it runs outside its package folder. Set "Process to track" in the game settings.'
      : 'Ember could not detect the game running. Set "Process to track" in the game settings.');
}

function finish(id, discard, msg) {
  const st = active.get(id);
  if (!st) return;
  clearInterval(st.timer); active.delete(id);
  syncTargetPidsToDaemon();
  if (discard) db.prepare('DELETE FROM sessions WHERE id=?').run(st.sid);
  else db.prepare('UPDATE sessions SET ended=? WHERE id=?').run(Math.max(st.last, st.started), st.sid);
  send('run'); if (msg) send('toast', msg);
  // Hide overlay if disabled and no more games running
  if (!active.size && !overlaySettings.enabled) overlayHide();
}

const h = (c, f) => ipcMain.handle(c, (_, ...a) => f(...a));
h('games', () => (refreshStartIds(), {
  games: all(`SELECT g.*, COALESCE((SELECT SUM(ended-started) FROM sessions WHERE game_id=g.id AND ended IS NOT NULL),0) total,
    (SELECT MAX(started) FROM sessions WHERE game_id=g.id) last FROM games g`).map(g => ({ ...g, missing: g.method === 'aumid' ? !!startIds && !startIds.has(g.aumid.toLowerCase()) : !fs.existsSync(g.emulator || g.exe) || (!!g.emulator && !fs.existsSync(g.exe)) })),
  running: Object.fromEntries([...active].map(([i, s]) => [i, s.started]))
}));
h('sessions', () => all(`SELECT s.id, s.game_id, s.started, COALESCE(s.ended,s.beat) ended, s.ended IS NULL live
  FROM sessions s ORDER BY s.started DESC LIMIT 300`));
// Per-day, per-game playtime for the last 120 days; sessions crossing midnight are split between days.
const pad2 = n => String(n).padStart(2, '0');
h('stats', () => {
  const rows = all('SELECT game_id g, started s, ended e, beat b FROM sessions WHERE COALESCE(ended,beat,started) >= ?', Date.now() - 120 * 864e5);
  const out = {}, now = Date.now();
  for (const r of rows) {
    const end = r.e ?? (active.has(r.g) ? now : (r.b ?? r.s));
    for (let t = r.s; t < end;) {
      const d = new Date(t), next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
      const k = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}|${r.g}`;
      out[k] = (out[k] || 0) + Math.min(end, next) - t; t = next;
    }
  }
  return Object.entries(out).map(([k, ms]) => { const [day, g] = k.split('|'); return { day, g: +g, ms }; });
});
h('save', g => {
  const v = [(g.name || '').trim() || path.parse(g.exe).name || g.aumid || '', g.exe || '', g.args || '', g.emulator || '', g.cover || '', g.track || '', g.grp || ''];
  if (g.id) db.prepare('UPDATE games SET name=?,exe=?,args=?,emulator=?,cover=?,track=?,grp=? WHERE id=?').run(...v, g.id);
  else db.prepare('INSERT INTO games(name,exe,args,emulator,cover,track,grp,added) VALUES(?,?,?,?,?,?,?,?)').run(...v, Date.now());
  return true;
});
h('remove', id => {
  finish(id, false);
  db.prepare('DELETE FROM sessions WHERE game_id=?').run(id);
  db.prepare('DELETE FROM games WHERE id=?').run(id);
  return true;
});
h('launch', id => launch(id));
// ---- Import Windows applications (Start menu)
h('import:list', async () => {
  const r = await listStartApps();
  if (!r.ok) return r;
  const have = new Set(all("SELECT aumid FROM games WHERE method='aumid'").map(x => x.aumid.toLowerCase()));
  return { ok: true, apps: r.apps.map(a => ({ ...a, imported: have.has(a.aumid.toLowerCase()) })) };
});
h('import:add', list => {
  let added = 0, skipped = 0;
  const ins = db.prepare("INSERT INTO games(name,exe,args,emulator,cover,track,grp,added,aumid,method) VALUES(?,?,?,?,?,?,?,?,?,?)");
  const has = db.prepare("SELECT 1 FROM games WHERE lower(aumid)=lower(?) AND method='aumid'");
  for (const a of (Array.isArray(list) ? list : []).slice(0, 500)) {
    const aumid = String(a?.aumid ?? '').trim(), name = String(a?.name ?? '').trim() || aumid;
    if (!validAumid(aumid) || (startIds && !startIds.has(aumid.toLowerCase())) || has.get(aumid)) { skipped++; continue; }
    try { ins.run(name, '', '', '', '', '', '', Date.now(), aumid, 'aumid'); added++; } catch { skipped++; }
  }
  return { added, skipped };
});
h('theme', t => {
  const c = t === 'light' ? '#f4f0ec' : '#0d0e11';
  if (win && !win.isDestroyed()) win.setBackgroundColor(c);
});
// ---- Custom Window Controls IPC handlers
h('win:min', () => { if (win && !win.isDestroyed()) win.minimize(); });
h('win:max', () => {
  if (!win || win.isDestroyed()) return false;
  win.isMaximized() ? win.unmaximize() : win.maximize();
  return win.isMaximized();
});
h('win:close', () => { if (win && !win.isDestroyed()) win.close(); });
h('win:isMax', () => (win && !win.isDestroyed() ? win.isMaximized() : false));

h('pick', async kind => {
  const filters = { exe: [{ name: 'Programs', extensions: ['exe', 'lnk', 'bat'] }], file: [{ name: 'All files', extensions: ['*'] }],
    image: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }] }[kind];
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters });
  if (r.canceled) return null;
  if (kind !== 'image') return r.filePaths[0];
  const dir = path.join(app.getPath('userData'), 'covers'); // copy so covers survive moves/deletes
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, Date.now() + path.extname(r.filePaths[0]));
  fs.copyFileSync(r.filePaths[0], dest);
  return dest;
});

// ---- Overlay IPC handlers
h('overlay:toggle', () => {
  if (!overlayWin || overlayWin.isDestroyed()) return overlaySettings.enabled;
  if (overlayWin.isVisible()) {
    overlaySettings.enabled = false;
    saveOverlaySettings();
    overlayHide();
    send('overlay:settings-updated', overlaySettings);
    return false;
  } else {
    overlaySettings.enabled = true;
    saveOverlaySettings();
    overlayShowIfEnabled();
    send('overlay:settings-updated', overlaySettings);
    return true;
  }
});

h('overlay:settings', s => {
  overlaySettings = sanitizeOverlaySettings({
    ...overlaySettings,
    ...s,
    metrics: { ...overlaySettings.metrics, ...((s && s.metrics) || {}) }
  });
  saveOverlaySettings();
  // Propagate settings to overlay window immediately
  if (overlayWin && !overlayWin.isDestroyed()) {
    overlayWin.webContents.send('settings', overlaySettings);
  }
  applyOverlayBounds();
  if (overlaySettings.enabled) {
    overlayShowIfEnabled();
  } else {
    overlayHide();
  }
  send('overlay:settings-updated', overlaySettings);
  return overlaySettings;
});

ipcMain.on('overlay:resize', (_, dims) => {
  if (!dims || typeof dims.width !== 'number' || typeof dims.height !== 'number') return;
  applyOverlayBounds(dims.width, dims.height);
});

ipcMain.on('overlay:mouse', (_, ignore) => {
  if (!overlayWin || overlayWin.isDestroyed() || dragState) return;
  if (ignore) {
    overlayWin.setIgnoreMouseEvents(true, { forward: true });
  } else {
    overlayWin.setIgnoreMouseEvents(false);
  }
});

ipcMain.on('overlay:drag-start', () => {
  if (!overlayWin || overlayWin.isDestroyed()) return;
  if (dragInterval) { clearInterval(dragInterval); dragInterval = null; }
  const [winX, winY] = overlayWin.getPosition();
  const cursor = screen.getCursorScreenPoint();
  dragState = { startWinX: winX, startWinY: winY, startCursorX: cursor.x, startCursorY: cursor.y };
  overlayWin.setIgnoreMouseEvents(false);
  dragInterval = setInterval(() => {
    if (!overlayWin || overlayWin.isDestroyed() || !dragState) return;
    const cur = screen.getCursorScreenPoint();
    const display = screen.getPrimaryDisplay();
    const wa = display.workArea;
    const nx = Math.max(wa.x, Math.min(wa.x + wa.width - overlayBounds.width, dragState.startWinX + (cur.x - dragState.startCursorX)));
    const ny = Math.max(wa.y, Math.min(wa.y + wa.height - overlayBounds.height, dragState.startWinY + (cur.y - dragState.startCursorY)));
    overlayWin.setPosition(Math.round(nx), Math.round(ny));
  }, 16);
});

ipcMain.on('overlay:drag-end', () => {
  if (dragInterval) { clearInterval(dragInterval); dragInterval = null; }
  if (!dragState) return;
  dragState = null;
  if (overlayWin && !overlayWin.isDestroyed()) {
    const [x, y] = overlayWin.getPosition();
    overlaySettings.position = 'custom';
    overlaySettings.customX = x;
    overlaySettings.customY = y;
    saveOverlaySettings();
    overlayWin.webContents.send('settings', overlaySettings);
    send('overlay:settings-updated', overlaySettings);
  }
});

h('overlay:getSettings', () => overlaySettings);
h('app:getSettings', () => currentAppSettings());
h('app:settings', s => {
  s = s || {};
  if ('background' in s) appSettings.background = !!s.background;
  if ('showStartupMessage' in s) appSettings.showStartupMessage = !!s.showStartupMessage;
  if ('launchAtStartup' in s && !!s.launchAtStartup !== startupEnabled()) setStartup(s.launchAtStartup);
  appSettings.launchAtStartup = startupEnabled();
  saveAppSettings(); applyTray();
  return currentAppSettings();
});

h('overlay:show', () => {
  overlayShowIfEnabled();
  return true;
});

h('overlay:hide', () => {
  overlayHide();
  return true;
});

// ---- Updates: installed copies update in-app via GitHub Releases; portable copies are pointed to the release page.
const REPO = 'laggzilla16/ember-universal-launcher';
const portable = !!process.env.PORTABLE_EXECUTABLE_DIR;
const canAuto = app.isPackaged && !portable;
let manualCheck = false, updater;
const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
function initUpdates() {
  if (!canAuto) return;
  updater = require('electron-updater').autoUpdater;
  updater.autoDownload = false;
  updater.on('update-available', i => send('update', { state: 'available', version: i.version }));
  updater.on('update-not-available', () => manualCheck && send('update', { state: 'none' }));
  updater.on('download-progress', p => send('update', { state: 'progress', percent: Math.round(p.percent) }));
  updater.on('update-downloaded', i => send('update', { state: 'ready', version: i.version }));
  updater.on('error', e => manualCheck && send('update', { state: 'error', message: e.message }));
}
async function checkUpdates(manual) {
  manualCheck = manual;
  try {
    if (canAuto) return void await updater.checkForUpdates();
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { 'User-Agent': 'ember-launcher' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json(), v = String(j.tag_name).replace(/^v/, '');
    if (newer(v, app.getVersion())) send('update', { state: 'available', version: v, portable: true, url: j.html_url });
    else if (manual) send('update', { state: 'none' });
  } catch (e) { if (manual) send('update', { state: 'error', message: e.message }); }
}
h('version', () => ({ v: app.getVersion(), auto: canAuto }));
h('update:check', () => checkUpdates(true));
h('update:download', () => updater && updater.downloadUpdate());
h('update:install', () => updater && updater.quitAndInstall());
h('open', url => { if (String(url).startsWith(`https://github.com/${REPO}`)) shell.openExternal(url); });

app.on('second-instance', (_e, argv) => { if (!(argv || []).includes(HIDDEN_ARG)) showMain(); });
app.on('before-quit', () => {
  quitting = true;
  if (dragInterval) { clearInterval(dragInterval); dragInterval = null; }
  if (tray) { tray.destroy(); tray = null; }
  for (const [id, st] of active) { if (st.seen) st.last = Date.now(); finish(id, !st.seen); }
  stopPerfPolling();
  stopPerfDaemon();
  if (overlayWin && !overlayWin.isDestroyed()) overlayWin.destroy();
});
app.whenReady().then(() => {
  if (!gotLock) return;
  initDb();
  loadOverlaySettings(); loadAppSettings();
  appSettings.launchAtStartup = startupEnabled(); // OS registration is the source of truth
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 720, minHeight: 520, backgroundColor: '#0d0e11', show: false, icon: LOGO,
    frame: false, titleBarStyle: 'hidden',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true }
  });
  applyTray();
  win.on('maximize', () => send('win:max', true));
  win.on('unmaximize', () => send('win:max', false));
  // Closing the window hides it to the tray when background mode is on; otherwise the app really quits
  // (the hidden overlay window would otherwise keep the process alive after the main window closes).
  win.on('close', e => {
    if (appSettings.background && !quitting) { e.preventDefault(); win.hide(); }
    else app.quit();
  });
  win.loadFile('renderer/index.html');
  // Auto-start launches hidden in the tray, but only if the tray is enabled (otherwise the window would be unreachable).
  win.once('ready-to-show', () => { if (!(startedHidden && appSettings.background)) win.show(); createOverlayWin(); });
  maybeShowWelcome();
  initUpdates();
  setTimeout(() => checkUpdates(false), 6000);
  setInterval(() => checkUpdates(false), 6 * 3600 * 1000);
});
app.on('window-all-closed', () => app.quit());

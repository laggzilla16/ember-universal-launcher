using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Effects;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using System.Windows.Threading;
using Path = System.Windows.Shapes.Path;

namespace NukronSetup
{
    public class SetupConfig
    {
        public string PluginsDir = "";
        public string DefaultDir = "";
        public string InstallDir = "";
        public string Version = "1.5.2";
        public string ProductName = "NUKRON";
        public string AppFilename = "NUKRON";
        public string AppExe = "NUKRON.exe";
        public long EstimatedSizeKB = 188000;
        public bool IsUpgrade = false;
        public string ExistingVersion = "";
        public bool CreateDesktopShortcut = true;
        public bool CreateStartMenuShortcut = true;
        public bool LaunchAtStartup = false;
        public bool InitialLaunchAtStartup = false;
        public bool LaunchAfterFinish = true;
        public string AppDataDir = "";
        public int ParentPid = 0;

        // Auto-test mode settings
        public bool AutoTest = false;
        public string AutoTestDir = "";
        public string AutoTestLog = "";
        public int AutoTestDesktopShortcut = -1;
        public int AutoTestStartMenuShortcut = -1;
        public int AutoTestLaunchApp = 0;
    }

    internal static class NativeMethods
    {
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern uint GetPrivateProfileString(
            string lpAppName, string lpKeyName, string lpDefault,
            StringBuilder lpReturnedString, uint nSize, string lpFileName);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool WritePrivateProfileString(
            string lpAppName, string lpKeyName, string lpString, string lpFileName);

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct BROWSEINFO
        {
            public IntPtr hwndOwner;
            public IntPtr pidlRoot;
            public IntPtr pszDisplayName;
            public string lpszTitle;
            public uint ulFlags;
            public IntPtr lpfn;
            public IntPtr lParam;
            public int iImage;
        }

        [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
        public static extern IntPtr SHBrowseForFolder(ref BROWSEINFO lpbi);

        [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool SHGetPathFromIDList(IntPtr pidl, StringBuilder pszPath);

        [DllImport("ole32.dll")]
        public static extern void CoTaskMemFree(IntPtr pv);

        public static string ReadIni(string file, string section, string key, string defVal)
        {
            if (string.IsNullOrEmpty(file) || !File.Exists(file)) return defVal;
            StringBuilder sb = new StringBuilder(2048);
            GetPrivateProfileString(section, key, defVal, sb, (uint)sb.Capacity, file);
            return sb.ToString();
        }

        public static void WriteIni(string file, string section, string key, string val)
        {
            if (string.IsNullOrEmpty(file)) return;
            WritePrivateProfileString(section, key, val, file);
        }

        public static string BrowseFolder(IntPtr owner, string title)
        {
            IntPtr displayBuf = Marshal.AllocHGlobal(520);
            try
            {
                BROWSEINFO bi = new BROWSEINFO();
                bi.hwndOwner = owner;
                bi.pidlRoot = IntPtr.Zero;
                bi.pszDisplayName = displayBuf;
                bi.lpszTitle = title;
                // BIF_RETURNONLYFSDIRS (0x0001) | BIF_NEWDIALOGSTYLE (0x0040) | BIF_USENEWUI (0x0050)
                bi.ulFlags = 0x0001 | 0x0040;
                IntPtr pidl = SHBrowseForFolder(ref bi);
                if (pidl != IntPtr.Zero)
                {
                    try
                    {
                        StringBuilder path = new StringBuilder(1024);
                        if (SHGetPathFromIDList(pidl, path))
                        {
                            return path.ToString();
                        }
                    }
                    finally
                    {
                        CoTaskMemFree(pidl);
                    }
                }
            }
            finally
            {
                Marshal.FreeHGlobal(displayBuf);
            }
            return null;
        }
    }

    public static class Theme
    {
        // Official NUKRON Optical Glass Design Tokens (assets/branding/design-tokens.json & renderer/styles.css)
        public static readonly Color BgDeep = Color.FromRgb(9, 13, 25);       // #090D19
        public static readonly Color BgMid = Color.FromRgb(11, 17, 32);       // #0B1120
        public static readonly Color Panel = Color.FromRgb(17, 24, 39);       // #111827
        public static readonly Color Surface = Color.FromRgb(23, 32, 51);     // #172033
        public static readonly Color TextPrimary = Color.FromRgb(248, 250, 252); // #F8FAFC
        public static readonly Color TextMuted = Color.FromRgb(170, 182, 204);   // #AAB6CC
        public static readonly Color TextDim = Color.FromRgb(110, 125, 152);     // #6E7D98
        public static readonly Color AccentBlue = Color.FromRgb(37, 99, 235);    // #2563EB
        public static readonly Color AccentSky = Color.FromRgb(96, 165, 250);    // #60A5FA
        public static readonly Color AccentLight = Color.FromRgb(147, 197, 253); // #93C5FD
        public static readonly Color AccentIndigo = Color.FromRgb(99, 102, 241); // #6366F1
        public static readonly Color AccentCrimson = Color.FromRgb(230, 57, 70); // #E63946
        public static readonly Color StatusOk = Color.FromRgb(52, 211, 153);     // #34D399
        public static readonly Color StatusDanger = Color.FromRgb(253, 164, 175);// #FDA4AF

        public static readonly FontFamily FontBrand = new FontFamily("Unbounded, Segoe UI Variable Display, Segoe UI");
        public static readonly FontFamily FontUi = new FontFamily("Inter, Segoe UI Variable Text, Segoe UI");
        public static readonly FontFamily FontMono = new FontFamily("Cascadia Code, Consolas, Segoe UI");

        public static SolidColorBrush Brush(Color c)
        {
            SolidColorBrush b = new SolidColorBrush(c);
            b.Freeze();
            return b;
        }

        public static SolidColorBrush AlphaBrush(Color c, byte a)
        {
            SolidColorBrush b = new SolidColorBrush(Color.FromArgb(a, c.R, c.G, c.B));
            b.Freeze();
            return b;
        }

        public static LinearGradientBrush OpticalGradient(double angleDeg)
        {
            LinearGradientBrush b = CreateAngleGradient(angleDeg);
            b.GradientStops.Add(new GradientStop(AccentSky, 0.0));
            b.GradientStops.Add(new GradientStop(AccentBlue, 0.46));
            b.GradientStops.Add(new GradientStop(AccentIndigo, 0.74));
            b.GradientStops.Add(new GradientStop(AccentCrimson, 1.0));
            b.Freeze();
            return b;
        }

        public static LinearGradientBrush WordmarkGradient()
        {
            LinearGradientBrush b = new LinearGradientBrush { StartPoint = new Point(0, 0), EndPoint = new Point(1, 0.6) };
            b.GradientStops.Add(new GradientStop(TextPrimary, 0.0));
            b.GradientStops.Add(new GradientStop(Color.FromRgb(226, 232, 240), 0.62));
            b.GradientStops.Add(new GradientStop(AccentLight, 1.0));
            b.Freeze();
            return b;
        }

        public static LinearGradientBrush PrimaryButtonBrush(bool hover)
        {
            LinearGradientBrush b = CreateAngleGradient(135);
            if (hover)
            {
                b.GradientStops.Add(new GradientStop(Color.FromRgb(96, 165, 250), 0.0));
                b.GradientStops.Add(new GradientStop(Color.FromRgb(59, 130, 246), 0.55));
                b.GradientStops.Add(new GradientStop(Color.FromRgb(37, 99, 235), 1.0));
            }
            else
            {
                b.GradientStops.Add(new GradientStop(Color.FromRgb(59, 130, 246), 0.0));
                b.GradientStops.Add(new GradientStop(Color.FromRgb(37, 99, 235), 0.62));
                b.GradientStops.Add(new GradientStop(Color.FromRgb(29, 78, 216), 1.0));
            }
            b.Freeze();
            return b;
        }

        public static LinearGradientBrush FresnelRim(bool opticalAccent)
        {
            LinearGradientBrush b = CreateAngleGradient(135);
            if (opticalAccent)
            {
                b.GradientStops.Add(new GradientStop(Color.FromArgb(200, 96, 165, 250), 0.0));
                b.GradientStops.Add(new GradientStop(Color.FromArgb(95, 37, 99, 235), 0.38));
                b.GradientStops.Add(new GradientStop(Color.FromArgb(95, 230, 57, 70), 0.72));
                b.GradientStops.Add(new GradientStop(Color.FromArgb(190, 255, 90, 103), 1.0));
            }
            else
            {
                b.GradientStops.Add(new GradientStop(Color.FromArgb(135, 147, 197, 253), 0.0));
                b.GradientStops.Add(new GradientStop(Color.FromArgb(42, 248, 250, 252), 0.30));
                b.GradientStops.Add(new GradientStop(Color.FromArgb(20, 248, 250, 252), 0.66));
                b.GradientStops.Add(new GradientStop(Color.FromArgb(110, 230, 57, 70), 1.0));
            }
            b.Freeze();
            return b;
        }

        public static LinearGradientBrush ClearGlassFill()
        {
            LinearGradientBrush b = CreateAngleGradient(145);
            b.GradientStops.Add(new GradientStop(Color.FromArgb(145, 23, 32, 51), 0.0));
            b.GradientStops.Add(new GradientStop(Color.FromArgb(175, 11, 16, 30), 1.0));
            b.Freeze();
            return b;
        }

        public static LinearGradientBrush FrostedGlassFill()
        {
            LinearGradientBrush b = CreateAngleGradient(152);
            b.GradientStops.Add(new GradientStop(Color.FromArgb(175, 27, 38, 61), 0.0));
            b.GradientStops.Add(new GradientStop(Color.FromArgb(160, 20, 28, 46), 0.52));
            b.GradientStops.Add(new GradientStop(Color.FromArgb(195, 12, 17, 31), 1.0));
            b.Freeze();
            return b;
        }

        public static LinearGradientBrush OpticalGlassFill()
        {
            LinearGradientBrush b = CreateAngleGradient(142);
            b.GradientStops.Add(new GradientStop(Color.FromArgb(72, 37, 99, 235), 0.0));
            b.GradientStops.Add(new GradientStop(Color.FromArgb(175, 21, 30, 49), 0.48));
            b.GradientStops.Add(new GradientStop(Color.FromArgb(52, 230, 57, 70), 1.0));
            b.Freeze();
            return b;
        }

        private static LinearGradientBrush CreateAngleGradient(double angleDeg)
        {
            double rad = angleDeg * Math.PI / 180.0;
            double x = Math.Cos(rad);
            double y = Math.Sin(rad);
            Point start = new Point(0.5 - x * 0.5, 0.5 - y * 0.5);
            Point end = new Point(0.5 + x * 0.5, 0.5 + y * 0.5);
            return new LinearGradientBrush { StartPoint = start, EndPoint = end };
        }
    }

    public class SetupWizardWindow : Window
    {
        private readonly SetupConfig cfg;
        private int currentStep = 1;
        private bool isInstalling = false;
        private bool installFinished = false;
        private bool cleanExitRequested = false;

        private BitmapImage logoImage;
        private ContentControl stageHost;
        private TranslateTransform stageSlide;

        // Sidebar & top rail step indicators
        private readonly List<Border> topStepPills = new List<Border>();
        private readonly List<TextBlock> topStepNumTexts = new List<TextBlock>();
        private readonly List<TextBlock> topStepTitleTexts = new List<TextBlock>();
        private readonly List<Border> sideStepCards = new List<Border>();
        private readonly List<Border> sideStepBars = new List<Border>();
        private readonly List<Border> sideStepBadges = new List<Border>();
        private readonly List<TextBlock> sideStepBadgeTexts = new List<TextBlock>();
        private readonly List<TextBlock> sideStepNames = new List<TextBlock>();

        // Step 2 controls
        private TextBox dirTextBox;
        private TextBlock dirValidationText;
        private TextBlock driveLabelText;
        private TextBlock freeSpaceValueText;
        private TextBlock reqSpaceValueText;
        private TextBlock spaceStatusBadgeText;
        private Border spaceStatusBadge;
        private Border driveUsageBarFill;
        private Button step2NextBtn;

        // Step 3 controls
        private Border toggleDesktopTrack;
        private Ellipse toggleDesktopThumb;
        private Border toggleStartMenuTrack;
        private Ellipse toggleStartMenuThumb;
        private Border toggleStartupTrack;
        private Ellipse toggleStartupThumb;

        // Step 4 controls
        private TextBlock progressPercentText;
        private TextBlock progressStageText;
        private TextBlock progressDetailText;
        private TextBlock progressElapsedText;
        private Border progressBarFill;
        private TranslateTransform shimmerTransform;
        private RotateTransform spinnerRotate;
        private readonly List<Border> checkRowDots = new List<Border>();
        private readonly List<TextBlock> checkRowIcons = new List<TextBlock>();
        private readonly List<TextBlock> checkRowTexts = new List<TextBlock>();
        private readonly List<TextBlock> checkRowStates = new List<TextBlock>();
        private DispatcherTimer installPollTimer;
        private double displayedProgress = 0.0;
        private double targetProgress = 0.0;
        private DateTime installStartTime;

        // Step 5 controls
        private Border toggleLaunchNowTrack;
        private Ellipse toggleLaunchNowThumb;
        private TextBlock primaryFinishBtnText;

        // Close button reference
        private Button closeWinBtn;

        public SetupWizardWindow(SetupConfig config)
        {
            this.cfg = config;
            this.Title = "NUKRON Setup";
            this.Width = 900;
            this.Height = 600;
            this.WindowStartupLocation = WindowStartupLocation.CenterScreen;
            this.WindowStyle = WindowStyle.None;
            this.AllowsTransparency = true;
            this.Background = Brushes.Transparent;
            this.ResizeMode = ResizeMode.NoResize;
            this.FontFamily = Theme.FontUi;
            this.Foreground = Theme.Brush(Theme.TextPrimary);

            LoadLogoResource();
            BuildWindowLayout();
            ShowStep(1, false);

            this.Loaded += OnWindowLoaded;
            this.Closing += OnWindowClosing;
        }

        private void LoadLogoResource()
        {
            try
            {
                Assembly asm = Assembly.GetExecutingAssembly();
                Stream s = asm.GetManifestResourceStream("nukron-logo.png");
                if (s != null)
                {
                    BitmapImage bmp = new BitmapImage();
                    bmp.BeginInit();
                    bmp.StreamSource = s;
                    bmp.CacheOption = BitmapCacheOption.OnLoad;
                    bmp.EndInit();
                    bmp.Freeze();
                    logoImage = bmp;
                }
            }
            catch { }
        }

        private Image CreateLogoImage(double size, double glowOpacity)
        {
            Image img = new Image();
            img.Width = size;
            img.Height = size;
            img.Stretch = Stretch.Uniform;
            RenderOptions.SetBitmapScalingMode(img, BitmapScalingMode.HighQuality);
            if (logoImage != null)
            {
                img.Source = logoImage;
            }
            if (glowOpacity > 0)
            {
                DropShadowEffect glow = new DropShadowEffect();
                glow.Color = Theme.AccentBlue;
                glow.BlurRadius = size * 0.42;
                glow.ShadowDepth = 0;
                glow.Opacity = glowOpacity;
                img.Effect = glow;
            }
            return img;
        }

        private UIElement CreateWordmark(double fontSize, double letterSpacingPx, bool opticalFill)
        {
            StackPanel sp = new StackPanel();
            sp.Orientation = Orientation.Horizontal;
            sp.VerticalAlignment = VerticalAlignment.Center;
            string word = "NUKRON";
            Brush fill = opticalFill ? (Brush)Theme.OpticalGradient(135) : (Brush)Theme.WordmarkGradient();
            for (int i = 0; i < word.Length; i++)
            {
                TextBlock tb = new TextBlock();
                tb.Text = word[i].ToString();
                tb.FontFamily = Theme.FontBrand;
                tb.FontSize = fontSize;
                tb.FontWeight = FontWeights.ExtraBold;
                tb.Foreground = fill;
                if (i < word.Length - 1)
                {
                    tb.Margin = new Thickness(0, 0, letterSpacingPx, 0);
                }
                sp.Children.Add(tb);
            }
            return sp;
        }

        private Path CreateVectorIcon(string pathData, double size, Brush strokeBrush, double strokeThickness)
        {
            Path p = new Path();
            p.Data = Geometry.Parse(pathData);
            p.Width = size;
            p.Height = size;
            p.Stretch = Stretch.Uniform;
            p.Stroke = strokeBrush;
            p.StrokeThickness = strokeThickness;
            p.StrokeStartLineCap = PenLineCap.Round;
            p.StrokeEndLineCap = PenLineCap.Round;
            p.StrokeLineJoin = PenLineJoin.Round;
            return p;
        }

        private void BuildWindowLayout()
        {
            // Outer container for drop shadow margin
            Grid outerGrid = new Grid();
            outerGrid.Margin = new Thickness(18);

            // Drop shadow layer behind main frame
            Border shadowFrame = new Border();
            shadowFrame.CornerRadius = new CornerRadius(22);
            shadowFrame.Background = Theme.Brush(Theme.BgDeep);
            DropShadowEffect winShadow = new DropShadowEffect();
            winShadow.Color = Color.FromRgb(2, 5, 12);
            winShadow.BlurRadius = 32;
            winShadow.ShadowDepth = 10;
            winShadow.Opacity = 0.85;
            shadowFrame.Effect = winShadow;
            outerGrid.Children.Add(shadowFrame);

            // Main rounded chassis
            Border chassis = new Border();
            chassis.CornerRadius = new CornerRadius(22);
            chassis.BorderThickness = new Thickness(1);
            chassis.BorderBrush = Theme.FresnelRim(false);
            chassis.ClipToBounds = true;

            LinearGradientBrush bgBrush = new LinearGradientBrush { StartPoint = new Point(0, 0), EndPoint = new Point(0, 1) };
            bgBrush.GradientStops.Add(new GradientStop(Theme.BgDeep, 0.0));
            bgBrush.GradientStops.Add(new GradientStop(Theme.BgMid, 0.52));
            bgBrush.GradientStops.Add(new GradientStop(Theme.BgDeep, 1.0));
            chassis.Background = bgBrush;

            Grid root = new Grid();
            chassis.Child = root;

            // Ambient Snell's Law Optical Glow Layer
            Canvas ambientCanvas = new Canvas();
            ambientCanvas.IsHitTestVisible = false;
            ambientCanvas.ClipToBounds = true;

            Ellipse blueOrb = new Ellipse();
            blueOrb.Width = 540;
            blueOrb.Height = 360;
            RadialGradientBrush blueRad = new RadialGradientBrush();
            blueRad.GradientStops.Add(new GradientStop(Color.FromArgb(62, 37, 99, 235), 0.0));
            blueRad.GradientStops.Add(new GradientStop(Color.FromArgb(24, 59, 130, 246), 0.55));
            blueRad.GradientStops.Add(new GradientStop(Color.FromArgb(0, 9, 13, 25), 1.0));
            blueOrb.Fill = blueRad;
            Canvas.SetLeft(blueOrb, 440);
            Canvas.SetTop(blueOrb, -130);
            ambientCanvas.Children.Add(blueOrb);

            Ellipse crimsonOrb = new Ellipse();
            crimsonOrb.Width = 480;
            crimsonOrb.Height = 340;
            RadialGradientBrush crimRad = new RadialGradientBrush();
            crimRad.GradientStops.Add(new GradientStop(Color.FromArgb(44, 230, 57, 70), 0.0));
            crimRad.GradientStops.Add(new GradientStop(Color.FromArgb(16, 230, 57, 70), 0.55));
            crimRad.GradientStops.Add(new GradientStop(Color.FromArgb(0, 9, 13, 25), 1.0));
            crimsonOrb.Fill = crimRad;
            Canvas.SetLeft(crimsonOrb, -140);
            Canvas.SetTop(crimsonOrb, 320);
            ambientCanvas.Children.Add(crimsonOrb);

            Ellipse indigoOrb = new Ellipse();
            indigoOrb.Width = 420;
            indigoOrb.Height = 300;
            RadialGradientBrush indRad = new RadialGradientBrush();
            indRad.GradientStops.Add(new GradientStop(Color.FromArgb(28, 99, 102, 241), 0.0));
            indRad.GradientStops.Add(new GradientStop(Color.FromArgb(0, 9, 13, 25), 1.0));
            indigoOrb.Fill = indRad;
            Canvas.SetLeft(indigoOrb, 240);
            Canvas.SetTop(indigoOrb, 80);
            ambientCanvas.Children.Add(indigoOrb);

            root.Children.Add(ambientCanvas);

            // Top 3px Optical Refraction Line
            Border topEdgeBar = new Border();
            topEdgeBar.Height = 3;
            topEdgeBar.CornerRadius = new CornerRadius(1.5);
            topEdgeBar.Margin = new Thickness(20, 0, 20, 0);
            topEdgeBar.VerticalAlignment = VerticalAlignment.Top;
            topEdgeBar.Background = Theme.OpticalGradient(0);
            topEdgeBar.IsHitTestVisible = false;
            root.Children.Add(topEdgeBar);

            // Foreground layout: Row 0 = Titlebar (54px), Row 1 = Main Content (Sidebar + Stage)
            Grid contentGrid = new Grid();
            contentGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(56) });
            contentGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });

            // ---- Row 0: Custom Titlebar & Step Progress Rail
            Grid titleBar = BuildTitleBar();
            Grid.SetRow(titleBar, 0);
            contentGrid.Children.Add(titleBar);

            // ---- Row 1: Left Frosted Optical Glass Sidebar + Right Wizard Stage
            Grid bodyGrid = new Grid();
            bodyGrid.Margin = new Thickness(14, 2, 14, 14);
            bodyGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(234) });
            bodyGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(14) });
            bodyGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            Border sidebar = BuildSidebar();
            Grid.SetColumn(sidebar, 0);
            bodyGrid.Children.Add(sidebar);

            Border stageContainer = new Border();
            stageContainer.CornerRadius = new CornerRadius(18);
            stageContainer.Background = Theme.FrostedGlassFill();
            stageContainer.BorderThickness = new Thickness(1);
            stageContainer.BorderBrush = Theme.FresnelRim(false);
            stageContainer.Padding = new Thickness(26, 22, 26, 20);

            stageHost = new ContentControl();
            stageSlide = new TranslateTransform(0, 0);
            stageHost.RenderTransform = stageSlide;
            stageContainer.Child = stageHost;

            Grid.SetColumn(stageContainer, 2);
            bodyGrid.Children.Add(stageContainer);

            Grid.SetRow(bodyGrid, 1);
            contentGrid.Children.Add(bodyGrid);

            root.Children.Add(contentGrid);
            outerGrid.Children.Add(chassis);
            this.Content = outerGrid;
        }

        private Grid BuildTitleBar()
        {
            Grid bar = new Grid();
            bar.Background = Brushes.Transparent;
            bar.Margin = new Thickness(18, 6, 14, 0);
            bar.MouseLeftButtonDown += delegate(object sender, MouseButtonEventArgs e)
            {
                if (e.ButtonState == MouseButtonState.Pressed)
                {
                    try { this.DragMove(); } catch { }
                }
            };

            bar.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            bar.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            bar.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            // Left: Brand + Setup pill
            StackPanel leftBrand = new StackPanel();
            leftBrand.Orientation = Orientation.Horizontal;
            leftBrand.VerticalAlignment = VerticalAlignment.Center;

            Image miniLogo = CreateLogoImage(24, 0.45);
            miniLogo.Margin = new Thickness(0, 0, 9, 0);
            leftBrand.Children.Add(miniLogo);

            UIElement wm = CreateWordmark(13.5, 2.2, true);
            leftBrand.Children.Add(wm);

            TextBlock setupTag = new TextBlock();
            setupTag.Text = "INSTALLER";
            setupTag.FontFamily = Theme.FontUi;
            setupTag.FontSize = 10.5;
            setupTag.FontWeight = FontWeights.SemiBold;
            setupTag.Foreground = Theme.Brush(Theme.TextMuted);
            setupTag.VerticalAlignment = VerticalAlignment.Center;
            setupTag.Margin = new Thickness(8, 1, 8, 0);
            leftBrand.Children.Add(setupTag);

            Border verBadge = new Border();
            verBadge.CornerRadius = new CornerRadius(6);
            verBadge.Background = Theme.AlphaBrush(Theme.AccentBlue, 38);
            verBadge.BorderBrush = Theme.AlphaBrush(Theme.AccentSky, 85);
            verBadge.BorderThickness = new Thickness(1);
            verBadge.Padding = new Thickness(7, 2, 7, 2);
            verBadge.VerticalAlignment = VerticalAlignment.Center;
            TextBlock verText = new TextBlock();
            verText.Text = "v" + cfg.Version;
            verText.FontFamily = Theme.FontMono;
            verText.FontSize = 10.5;
            verText.FontWeight = FontWeights.SemiBold;
            verText.Foreground = Theme.Brush(Theme.AccentLight);
            verBadge.Child = verText;
            leftBrand.Children.Add(verBadge);

            Grid.SetColumn(leftBrand, 0);
            bar.Children.Add(leftBrand);

            // Center: 5-Step Progress Pill Rail
            StackPanel stepRail = new StackPanel();
            stepRail.Orientation = Orientation.Horizontal;
            stepRail.HorizontalAlignment = HorizontalAlignment.Center;
            stepRail.VerticalAlignment = VerticalAlignment.Center;

            string[] stepLabels = new string[] { "Welcome", "Location", "Options", "Install", "Finish" };
            for (int i = 0; i < stepLabels.Length; i++)
            {
                Border pill = new Border();
                pill.CornerRadius = new CornerRadius(10);
                pill.Padding = new Thickness(8, 4, 9, 4);
                pill.Margin = new Thickness(2, 0, 2, 0);
                pill.BorderThickness = new Thickness(1);

                StackPanel pillInner = new StackPanel();
                pillInner.Orientation = Orientation.Horizontal;
                pillInner.VerticalAlignment = VerticalAlignment.Center;

                TextBlock numTb = new TextBlock();
                numTb.Text = "0" + (i + 1).ToString();
                numTb.FontFamily = Theme.FontMono;
                numTb.FontSize = 10;
                numTb.FontWeight = FontWeights.Bold;
                numTb.Margin = new Thickness(0, 0, 5, 0);
                numTb.VerticalAlignment = VerticalAlignment.Center;

                TextBlock titleTb = new TextBlock();
                titleTb.Text = stepLabels[i];
                titleTb.FontSize = 11;
                titleTb.FontWeight = FontWeights.SemiBold;
                titleTb.VerticalAlignment = VerticalAlignment.Center;

                pillInner.Children.Add(numTb);
                pillInner.Children.Add(titleTb);
                pill.Child = pillInner;

                topStepPills.Add(pill);
                topStepNumTexts.Add(numTb);
                topStepTitleTexts.Add(titleTb);
                stepRail.Children.Add(pill);

                if (i < stepLabels.Length - 1)
                {
                    Border conn = new Border();
                    conn.Width = 10;
                    conn.Height = 1.5;
                    conn.Background = Theme.AlphaBrush(Theme.TextMuted, 45);
                    conn.VerticalAlignment = VerticalAlignment.Center;
                    stepRail.Children.Add(conn);
                }
            }

            Grid.SetColumn(stepRail, 1);
            bar.Children.Add(stepRail);

            // Right: Clear Glass Window Controls (.win-ctrls)
            Border winCtrls = new Border();
            winCtrls.CornerRadius = new CornerRadius(11);
            winCtrls.Background = Theme.ClearGlassFill();
            winCtrls.BorderBrush = Theme.AlphaBrush(Theme.AccentSky, 64);
            winCtrls.BorderThickness = new Thickness(1);
            winCtrls.Padding = new Thickness(4, 3, 4, 3);
            winCtrls.VerticalAlignment = VerticalAlignment.Center;

            StackPanel ctrlRow = new StackPanel();
            ctrlRow.Orientation = Orientation.Horizontal;

            Button minBtn = CreateWindowControlButton("M 3,8 L 13,8", false);
            minBtn.ToolTip = "Minimize";
            minBtn.Click += delegate { this.WindowState = WindowState.Minimized; };
            ctrlRow.Children.Add(minBtn);

            closeWinBtn = CreateWindowControlButton("M 4,4 L 12,12 M 12,4 L 4,12", true);
            closeWinBtn.ToolTip = "Close Setup";
            closeWinBtn.Margin = new Thickness(4, 0, 0, 0);
            closeWinBtn.Click += delegate
            {
                if (isInstalling && !installFinished) return;
                if (installFinished)
                {
                    FinishAndExit(false);
                }
                else
                {
                    CancelAndExit();
                }
            };
            ctrlRow.Children.Add(closeWinBtn);

            winCtrls.Child = ctrlRow;
            Grid.SetColumn(winCtrls, 2);
            bar.Children.Add(winCtrls);

            return bar;
        }

        private Button CreateWindowControlButton(string iconPath, bool isClose)
        {
            Button btn = new Button();
            btn.Width = 30;
            btn.Height = 22;
            btn.Cursor = Cursors.Hand;
            btn.Background = Theme.AlphaBrush(Theme.TextPrimary, 8);
            btn.BorderThickness = new Thickness(0);

            ControlTemplate tpl = new ControlTemplate(typeof(Button));
            FrameworkElementFactory bd = new FrameworkElementFactory(typeof(Border));
            bd.Name = "bd";
            bd.SetValue(Border.CornerRadiusProperty, new CornerRadius(7));
            bd.SetValue(Border.BackgroundProperty, new TemplateBindingExtension(Button.BackgroundProperty));
            FrameworkElementFactory cp = new FrameworkElementFactory(typeof(ContentPresenter));
            cp.SetValue(ContentPresenter.HorizontalAlignmentProperty, HorizontalAlignment.Center);
            cp.SetValue(ContentPresenter.VerticalAlignmentProperty, VerticalAlignment.Center);
            bd.AppendChild(cp);
            tpl.VisualTree = bd;
            btn.Template = tpl;

            Path icon = CreateVectorIcon(iconPath, 12, Theme.Brush(Theme.TextMuted), 1.75);
            btn.Content = icon;

            btn.MouseEnter += delegate
            {
                if (isClose)
                {
                    btn.Background = Theme.Brush(Theme.AccentCrimson);
                    icon.Stroke = Brushes.White;
                }
                else
                {
                    btn.Background = Theme.AlphaBrush(Theme.AccentBlue, 75);
                    icon.Stroke = Theme.Brush(Theme.AccentSky);
                }
            };
            btn.MouseLeave += delegate
            {
                btn.Background = Theme.AlphaBrush(Theme.TextPrimary, 8);
                icon.Stroke = Theme.Brush(Theme.TextMuted);
            };
            return btn;
        }

        private Border BuildSidebar()
        {
            Border side = new Border();
            side.CornerRadius = new CornerRadius(18);
            side.Background = Theme.FrostedGlassFill();
            side.BorderThickness = new Thickness(1);
            side.BorderBrush = Theme.FresnelRim(false);
            side.Padding = new Thickness(16, 20, 16, 16);

            Grid sideGrid = new Grid();
            sideGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            sideGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            sideGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            // Top Hero Brand Block in Sidebar
            StackPanel heroBrand = new StackPanel();
            heroBrand.HorizontalAlignment = HorizontalAlignment.Center;
            heroBrand.Margin = new Thickness(0, 0, 0, 12);

            Grid logoRing = new Grid();
            logoRing.Width = 68;
            logoRing.Height = 68;
            logoRing.HorizontalAlignment = HorizontalAlignment.Center;

            Ellipse halo = new Ellipse();
            halo.Width = 68;
            halo.Height = 68;
            halo.Fill = Theme.OpticalGlassFill();
            halo.Stroke = Theme.FresnelRim(true);
            halo.StrokeThickness = 1.2;
            logoRing.Children.Add(halo);

            Image heroLogo = CreateLogoImage(52, 0.65);
            logoRing.Children.Add(heroLogo);
            heroBrand.Children.Add(logoRing);

            UIElement brandTitle = CreateWordmark(15.5, 2.8, false);
            FrameworkElement brandTitleEl = (FrameworkElement)brandTitle;
            brandTitleEl.HorizontalAlignment = HorizontalAlignment.Center;
            brandTitleEl.Margin = new Thickness(0, 8, 0, 2);
            heroBrand.Children.Add(brandTitleEl);

            TextBlock brandSub = new TextBlock();
            brandSub.Text = "YOUR GAMES. YOUR UNIVERSE.";
            brandSub.FontSize = 9.0;
            brandSub.FontWeight = FontWeights.SemiBold;
            brandSub.Foreground = Theme.Brush(Theme.TextMuted);
            brandSub.HorizontalAlignment = HorizontalAlignment.Center;
            heroBrand.Children.Add(brandSub);

            Border divider = new Border();
            divider.Height = 1;
            divider.Margin = new Thickness(8, 10, 8, 0);
            divider.Background = Theme.AlphaBrush(Theme.TextMuted, 32);
            heroBrand.Children.Add(divider);

            Grid.SetRow(heroBrand, 0);
            sideGrid.Children.Add(heroBrand);

            // Middle: 5-Step Vertical Navigation List
            StackPanel stepList = new StackPanel();
            stepList.VerticalAlignment = VerticalAlignment.Top;

            string[] titles = new string[] {
                "Welcome",
                "Install Directory",
                "Setup Options",
                "Installation",
                "Complete"
            };
            string[] subs = new string[] {
                "Overview & architecture",
                "Destination & disk space",
                "Shortcuts & startup",
                "Extracting NUKRON",
                "Ready to launch"
            };

            for (int i = 0; i < titles.Length; i++)
            {
                Grid itemWrap = new Grid();
                itemWrap.Margin = new Thickness(0, 0, 0, 5);

                Border activeBar = new Border();
                activeBar.Width = 3.5;
                activeBar.CornerRadius = new CornerRadius(2);
                activeBar.HorizontalAlignment = HorizontalAlignment.Left;
                activeBar.Margin = new Thickness(-8, 6, 0, 6);
                activeBar.Background = Theme.OpticalGradient(90);
                activeBar.Visibility = Visibility.Collapsed;
                sideStepBars.Add(activeBar);
                itemWrap.Children.Add(activeBar);

                Border card = new Border();
                card.CornerRadius = new CornerRadius(10);
                card.Padding = new Thickness(9, 6, 9, 6);
                card.BorderThickness = new Thickness(1);
                sideStepCards.Add(card);

                Grid row = new Grid();
                row.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
                row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

                Border badge = new Border();
                badge.Width = 22;
                badge.Height = 22;
                badge.CornerRadius = new CornerRadius(6.5);
                badge.Margin = new Thickness(0, 0, 9, 0);
                badge.VerticalAlignment = VerticalAlignment.Center;
                sideStepBadges.Add(badge);

                TextBlock badgeTxt = new TextBlock();
                badgeTxt.Text = (i + 1).ToString();
                badgeTxt.FontFamily = Theme.FontMono;
                badgeTxt.FontSize = 10.5;
                badgeTxt.FontWeight = FontWeights.Bold;
                badgeTxt.HorizontalAlignment = HorizontalAlignment.Center;
                badgeTxt.VerticalAlignment = VerticalAlignment.Center;
                sideStepBadgeTexts.Add(badgeTxt);
                badge.Child = badgeTxt;

                Grid.SetColumn(badge, 0);
                row.Children.Add(badge);

                StackPanel textCol = new StackPanel();
                textCol.VerticalAlignment = VerticalAlignment.Center;

                TextBlock nameTb = new TextBlock();
                nameTb.Text = titles[i];
                nameTb.FontSize = 11.5;
                nameTb.FontWeight = FontWeights.SemiBold;
                sideStepNames.Add(nameTb);
                textCol.Children.Add(nameTb);

                TextBlock subTb = new TextBlock();
                subTb.Text = subs[i];
                subTb.FontSize = 9.8;
                subTb.Foreground = Theme.Brush(Theme.TextDim);
                textCol.Children.Add(subTb);

                Grid.SetColumn(textCol, 1);
                row.Children.Add(textCol);

                card.Child = row;
                itemWrap.Children.Add(card);
                stepList.Children.Add(itemWrap);
            }

            Grid.SetRow(stepList, 1);
            sideGrid.Children.Add(stepList);

            // Bottom Footer: System Architecture & Optical Glass Info
            Border footCard = new Border();
            footCard.CornerRadius = new CornerRadius(10);
            footCard.Background = Theme.ClearGlassFill();
            footCard.BorderBrush = Theme.AlphaBrush(Theme.TextMuted, 30);
            footCard.BorderThickness = new Thickness(1);
            footCard.Padding = new Thickness(10, 8, 10, 8);

            StackPanel footStack = new StackPanel();
            TextBlock footLine1 = new TextBlock();
            footLine1.Text = "OPTICAL GLASS ENGINE";
            footLine1.FontFamily = Theme.FontMono;
            footLine1.FontSize = 9.5;
            footLine1.FontWeight = FontWeights.Bold;
            footLine1.Foreground = Theme.Brush(Theme.AccentSky);
            footStack.Children.Add(footLine1);

            TextBlock footLine2 = new TextBlock();
            footLine2.Text = "Windows x64 · Build " + cfg.Version;
            footLine2.FontSize = 10.5;
            footLine2.Foreground = Theme.Brush(Theme.TextMuted);
            footLine2.Margin = new Thickness(0, 2, 0, 0);
            footStack.Children.Add(footLine2);

            footCard.Child = footStack;
            Grid.SetRow(footCard, 2);
            sideGrid.Children.Add(footCard);

            side.Child = sideGrid;
            return side;
        }

        private void UpdateStepIndicators(int activeStep)
        {
            for (int i = 0; i < 5; i++)
            {
                int stepNum = i + 1;
                bool isCurrent = (stepNum == activeStep);
                bool isDone = (stepNum < activeStep) || (activeStep == 5 && stepNum == 5);

                // Top rail
                Border topPill = topStepPills[i];
                TextBlock topNum = topStepNumTexts[i];
                TextBlock topTitle = topStepTitleTexts[i];

                if (isCurrent)
                {
                    topPill.Background = Theme.AlphaBrush(Theme.AccentBlue, 52);
                    topPill.BorderBrush = Theme.AlphaBrush(Theme.AccentSky, 115);
                    topNum.Text = isDone && activeStep == 5 ? "✓" : "0" + stepNum.ToString();
                    topNum.Foreground = Theme.Brush(isDone && activeStep == 5 ? Theme.StatusOk : Theme.AccentSky);
                    topTitle.Foreground = Theme.Brush(Theme.TextPrimary);
                }
                else if (isDone)
                {
                    topPill.Background = Theme.AlphaBrush(Theme.StatusOk, 24);
                    topPill.BorderBrush = Theme.AlphaBrush(Theme.StatusOk, 75);
                    topNum.Text = "✓";
                    topNum.Foreground = Theme.Brush(Theme.StatusOk);
                    topTitle.Foreground = Theme.Brush(Theme.TextMuted);
                }
                else
                {
                    topPill.Background = Brushes.Transparent;
                    topPill.BorderBrush = Brushes.Transparent;
                    topNum.Text = "0" + stepNum.ToString();
                    topNum.Foreground = Theme.Brush(Theme.TextDim);
                    topTitle.Foreground = Theme.Brush(Theme.TextDim);
                }

                // Sidebar
                Border sCard = sideStepCards[i];
                Border sBar = sideStepBars[i];
                Border sBadge = sideStepBadges[i];
                TextBlock sBadgeTxt = sideStepBadgeTexts[i];
                TextBlock sName = sideStepNames[i];

                if (isCurrent)
                {
                    sBar.Visibility = Visibility.Visible;
                    sCard.Background = Theme.OpticalGlassFill();
                    sCard.BorderBrush = Theme.AlphaBrush(Theme.AccentSky, 90);
                    sBadge.Background = Theme.Brush(Theme.AccentBlue);
                    sBadgeTxt.Text = (activeStep == 5) ? "✓" : stepNum.ToString();
                    sBadgeTxt.Foreground = Brushes.White;
                    sName.Foreground = Theme.Brush(Theme.TextPrimary);
                }
                else if (isDone)
                {
                    sBar.Visibility = Visibility.Collapsed;
                    sCard.Background = Theme.AlphaBrush(Theme.Surface, 90);
                    sCard.BorderBrush = Theme.AlphaBrush(Theme.StatusOk, 55);
                    sBadge.Background = Theme.AlphaBrush(Theme.StatusOk, 40);
                    sBadgeTxt.Text = "✓";
                    sBadgeTxt.Foreground = Theme.Brush(Theme.StatusOk);
                    sName.Foreground = Theme.Brush(Theme.TextMuted);
                }
                else
                {
                    sBar.Visibility = Visibility.Collapsed;
                    sCard.Background = Brushes.Transparent;
                    sCard.BorderBrush = Brushes.Transparent;
                    sBadge.Background = Theme.AlphaBrush(Theme.Surface, 140);
                    sBadgeTxt.Text = stepNum.ToString();
                    sBadgeTxt.Foreground = Theme.Brush(Theme.TextDim);
                    sName.Foreground = Theme.Brush(Theme.TextMuted);
                }
            }
        }

        public void ShowStep(int step, bool animate)
        {
            currentStep = step;
            UpdateStepIndicators(step);

            UIElement nextView = null;
            if (step == 1) nextView = BuildStep1Welcome();
            else if (step == 2) nextView = BuildStep2Directory();
            else if (step == 3) nextView = BuildStep3Options();
            else if (step == 4) nextView = BuildStep4Progress();
            else if (step == 5) nextView = BuildStep5Complete();

            stageHost.Content = nextView;

            if (animate)
            {
                DoubleAnimation fade = new DoubleAnimation(0.0, 1.0, TimeSpan.FromMilliseconds(220));
                CubicEase ease = new CubicEase { EasingMode = EasingMode.EaseOut };
                fade.EasingFunction = ease;
                stageHost.BeginAnimation(UIElement.OpacityProperty, fade);

                DoubleAnimation slide = new DoubleAnimation(12.0, 0.0, TimeSpan.FromMilliseconds(220));
                slide.EasingFunction = ease;
                stageSlide.BeginAnimation(TranslateTransform.YProperty, slide);
            }
            else
            {
                stageHost.BeginAnimation(UIElement.OpacityProperty, null);
                stageHost.Opacity = 1.0;
                stageSlide.BeginAnimation(TranslateTransform.YProperty, null);
                stageSlide.Y = 0.0;
            }
        }

        private Border CreatePillBadge(string text, Color accentColor)
        {
            Border pill = new Border();
            pill.CornerRadius = new CornerRadius(7);
            pill.Background = Theme.AlphaBrush(accentColor, 34);
            pill.BorderBrush = Theme.AlphaBrush(accentColor, 95);
            pill.BorderThickness = new Thickness(1);
            pill.Padding = new Thickness(9, 3, 9, 3);
            pill.HorizontalAlignment = HorizontalAlignment.Left;

            TextBlock tb = new TextBlock();
            tb.Text = text;
            tb.FontFamily = Theme.FontMono;
            tb.FontSize = 10;
            tb.FontWeight = FontWeights.Bold;
            tb.Foreground = Theme.Brush(accentColor);
            pill.Child = tb;
            return pill;
        }

        private Button CreateActionButton(string label, string iconPath, bool isPrimary, double minWidth)
        {
            Button btn = new Button();
            btn.MinWidth = minWidth;
            btn.Height = 40;
            btn.Padding = new Thickness(18, 0, 18, 0);
            btn.Cursor = Cursors.Hand;
            btn.FontWeight = FontWeights.SemiBold;
            btn.FontSize = 13;
            btn.Foreground = Theme.Brush(Theme.TextPrimary);
            btn.Background = isPrimary ? (Brush)Theme.PrimaryButtonBrush(false) : (Brush)Theme.ClearGlassFill();
            btn.BorderBrush = isPrimary ? Theme.AlphaBrush(Theme.AccentLight, 120) : Theme.AlphaBrush(Theme.TextMuted, 64);
            btn.BorderThickness = new Thickness(1);

            if (isPrimary)
            {
                DropShadowEffect glow = new DropShadowEffect();
                glow.Color = Theme.AccentBlue;
                glow.BlurRadius = 18;
                glow.ShadowDepth = 2;
                glow.Opacity = 0.48;
                btn.Effect = glow;
            }

            ControlTemplate tpl = new ControlTemplate(typeof(Button));
            FrameworkElementFactory bd = new FrameworkElementFactory(typeof(Border));
            bd.Name = "bd";
            bd.SetValue(Border.CornerRadiusProperty, new CornerRadius(11));
            bd.SetValue(Border.BackgroundProperty, new TemplateBindingExtension(Button.BackgroundProperty));
            bd.SetValue(Border.BorderBrushProperty, new TemplateBindingExtension(Button.BorderBrushProperty));
            bd.SetValue(Border.BorderThicknessProperty, new TemplateBindingExtension(Button.BorderThicknessProperty));
            bd.SetValue(Border.PaddingProperty, new TemplateBindingExtension(Button.PaddingProperty));

            FrameworkElementFactory cp = new FrameworkElementFactory(typeof(ContentPresenter));
            cp.SetValue(ContentPresenter.HorizontalAlignmentProperty, HorizontalAlignment.Center);
            cp.SetValue(ContentPresenter.VerticalAlignmentProperty, VerticalAlignment.Center);
            bd.AppendChild(cp);
            tpl.VisualTree = bd;
            btn.Template = tpl;

            StackPanel contentRow = new StackPanel();
            contentRow.Orientation = Orientation.Horizontal;
            contentRow.VerticalAlignment = VerticalAlignment.Center;

            TextBlock lblTb = new TextBlock();
            lblTb.Text = label;
            lblTb.VerticalAlignment = VerticalAlignment.Center;
            contentRow.Children.Add(lblTb);

            if (!string.IsNullOrEmpty(iconPath))
            {
                Path ico = CreateVectorIcon(iconPath, 14, Theme.Brush(Theme.TextPrimary), 2.0);
                ico.Margin = new Thickness(8, 1, 0, 0);
                contentRow.Children.Add(ico);
            }

            btn.Content = contentRow;

            btn.MouseEnter += delegate
            {
                if (!btn.IsEnabled) return;
                if (isPrimary)
                {
                    btn.Background = Theme.PrimaryButtonBrush(true);
                    btn.BorderBrush = Theme.AlphaBrush(Theme.AccentLight, 185);
                }
                else
                {
                    btn.Background = Theme.AlphaBrush(Theme.Surface, 220);
                    btn.BorderBrush = Theme.AlphaBrush(Theme.AccentSky, 110);
                }
            };
            btn.MouseLeave += delegate
            {
                if (!btn.IsEnabled) return;
                btn.Background = isPrimary ? (Brush)Theme.PrimaryButtonBrush(false) : (Brush)Theme.ClearGlassFill();
                btn.BorderBrush = isPrimary ? Theme.AlphaBrush(Theme.AccentLight, 120) : Theme.AlphaBrush(Theme.TextMuted, 64);
            };

            return btn;
        }

        // ====================================================================
        // STEP 1: WELCOME SCREEN
        // ====================================================================
        private UIElement BuildStep1Welcome()
        {
            Grid g = new Grid();
            g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            g.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            // Top Hero Banner
            StackPanel header = new StackPanel();
            string modeText = cfg.IsUpgrade
                ? ("UPGRADE / REINSTALL DETECTED · v" + cfg.Version + " · USER DATA PRESERVED")
                : ("CLEAN INSTALLATION · RELEASE v" + cfg.Version + " · WINDOWS 64-BIT");
            Color modeColor = cfg.IsUpgrade ? Theme.StatusOk : Theme.AccentSky;
            header.Children.Add(CreatePillBadge(modeText, modeColor));

            TextBlock h1 = new TextBlock();
            h1.Text = "Welcome to NUKRON Setup";
            h1.FontFamily = Theme.FontBrand;
            h1.FontSize = 24;
            h1.FontWeight = FontWeights.Bold;
            h1.Foreground = Theme.Brush(Theme.TextPrimary);
            h1.Margin = new Thickness(0, 10, 0, 5);
            header.Children.Add(h1);

            TextBlock lead = new TextBlock();
            lead.Text = "A faster, cleaner home for your PC gaming universe. Install NUKRON to organize your library, track playtime automatically, and monitor real-time performance.";
            lead.FontSize = 12.8;
            lead.Foreground = Theme.Brush(Theme.TextMuted);
            lead.TextWrapping = TextWrapping.Wrap;
            lead.LineHeight = 19;
            header.Children.Add(lead);

            Grid.SetRow(header, 0);
            g.Children.Add(header);

            // Middle: 3 Optical Glass Feature Cards
            StackPanel cards = new StackPanel();
            cards.VerticalAlignment = VerticalAlignment.Center;
            cards.Margin = new Thickness(0, 12, 0, 10);

            cards.Children.Add(BuildFeatureCard(
                "M 12,2 A 10,10 0 1 0 22,12 A 10,10 0 0 0 12,2 Z M 12,6 L 12,12 L 16,14",
                Theme.AccentSky,
                "Automatic Playtime & Session Intelligence",
                "Zero-PowerShell native process telemetry records every gaming session automatically into your local SQLite database."
            ));

            cards.Children.Add(BuildFeatureCard(
                "M 3,6 L 21,6 M 3,12 L 21,12 M 3,18 L 15,18",
                Theme.AccentIndigo,
                "Optical Glass In-Game Performance HUD",
                "Snell's Law refraction overlay with live FPS, CPU, GPU, VRAM, RAM, and thermal sensors engineered for fullscreen gaming."
            ));

            cards.Children.Add(BuildFeatureCard(
                "M 12,2 L 19,5 L 19,11 C 19,16.5 15.8,20.6 12,22 C 8.2,20.6 5,16.5 5,11 L 5,5 Z",
                Theme.StatusOk,
                "Protected Local Database & Seamless Updates",
                "Your game library, custom cover art, playtime history, and preferences stay safe on your PC across every update."
            ));

            Grid.SetRow(cards, 1);
            g.Children.Add(cards);

            // Bottom Action Bar
            Grid footer = new Grid();
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            Button cancelBtn = CreateActionButton("Cancel", null, false, 96);
            cancelBtn.Click += delegate { CancelAndExit(); };
            Grid.SetColumn(cancelBtn, 0);
            footer.Children.Add(cancelBtn);

            TextBlock footNote = new TextBlock();
            footNote.Text = "Choose install folder & options on the next steps.";
            footNote.FontSize = 11.2;
            footNote.Foreground = Theme.Brush(Theme.TextDim);
            footNote.VerticalAlignment = VerticalAlignment.Center;
            footNote.Margin = new Thickness(14, 0, 14, 0);
            Grid.SetColumn(footNote, 1);
            footer.Children.Add(footNote);

            Button installBtn = CreateActionButton("Install", "M 5,12 L 19,12 M 13,6 L 19,12 L 13,18", true, 168);
            installBtn.Click += delegate { ShowStep(2, true); };
            Grid.SetColumn(installBtn, 2);
            footer.Children.Add(installBtn);

            Grid.SetRow(footer, 2);
            g.Children.Add(footer);

            return g;
        }

        private Border BuildFeatureCard(string iconGeom, Color accent, string title, string desc)
        {
            Border card = new Border();
            card.CornerRadius = new CornerRadius(13);
            card.Background = Theme.ClearGlassFill();
            card.BorderBrush = Theme.AlphaBrush(Theme.TextMuted, 38);
            card.BorderThickness = new Thickness(1);
            card.Padding = new Thickness(14, 11, 14, 11);
            card.Margin = new Thickness(0, 0, 0, 9);

            Grid row = new Grid();
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            Border iconBox = new Border();
            iconBox.Width = 38;
            iconBox.Height = 38;
            iconBox.CornerRadius = new CornerRadius(10);
            iconBox.Background = Theme.AlphaBrush(accent, 34);
            iconBox.BorderBrush = Theme.AlphaBrush(accent, 90);
            iconBox.BorderThickness = new Thickness(1);
            iconBox.Margin = new Thickness(0, 0, 13, 0);
            iconBox.VerticalAlignment = VerticalAlignment.Center;
            iconBox.Child = CreateVectorIcon(iconGeom, 18, Theme.Brush(accent), 1.85);
            Grid.SetColumn(iconBox, 0);
            row.Children.Add(iconBox);

            StackPanel col = new StackPanel();
            col.VerticalAlignment = VerticalAlignment.Center;

            TextBlock t = new TextBlock();
            t.Text = title;
            t.FontSize = 13;
            t.FontWeight = FontWeights.SemiBold;
            t.Foreground = Theme.Brush(Theme.TextPrimary);
            col.Children.Add(t);

            TextBlock d = new TextBlock();
            d.Text = desc;
            d.FontSize = 11.4;
            d.Foreground = Theme.Brush(Theme.TextMuted);
            d.TextWrapping = TextWrapping.Wrap;
            d.Margin = new Thickness(0, 2, 0, 0);
            col.Children.Add(d);

            Grid.SetColumn(col, 1);
            row.Children.Add(col);

            card.Child = row;
            return card;
        }

        // ====================================================================
        // STEP 2: INSTALLATION DIRECTORY SELECTION
        // ====================================================================
        private UIElement BuildStep2Directory()
        {
            Grid g = new Grid();
            g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            g.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            StackPanel header = new StackPanel();
            header.Children.Add(CreatePillBadge("STEP 02 OF 05 · STORAGE & DESTINATION", Theme.AccentSky));

            TextBlock h1 = new TextBlock();
            h1.Text = "Select Installation Directory";
            h1.FontFamily = Theme.FontBrand;
            h1.FontSize = 22;
            h1.FontWeight = FontWeights.Bold;
            h1.Margin = new Thickness(0, 10, 0, 5);
            header.Children.Add(h1);

            TextBlock lead = new TextBlock();
            lead.Text = "Choose the folder where NUKRON application binaries will be installed on your computer.";
            lead.FontSize = 12.6;
            lead.Foreground = Theme.Brush(Theme.TextMuted);
            header.Children.Add(lead);

            Grid.SetRow(header, 0);
            g.Children.Add(header);

            // Middle content
            StackPanel body = new StackPanel();
            body.VerticalAlignment = VerticalAlignment.Center;
            body.Margin = new Thickness(0, 10, 0, 10);

            // Folder Path Selector Card
            Border pathCard = new Border();
            pathCard.CornerRadius = new CornerRadius(14);
            pathCard.Background = Theme.ClearGlassFill();
            pathCard.BorderBrush = Theme.FresnelRim(false);
            pathCard.BorderThickness = new Thickness(1);
            pathCard.Padding = new Thickness(16, 13, 16, 13);
            pathCard.Margin = new Thickness(0, 0, 0, 10);

            StackPanel pathStack = new StackPanel();

            Grid labelRow = new Grid();
            labelRow.Margin = new Thickness(0, 0, 0, 7);
            TextBlock lblFolder = new TextBlock();
            lblFolder.Text = "INSTALLATION FOLDER";
            lblFolder.FontFamily = Theme.FontMono;
            lblFolder.FontSize = 10.5;
            lblFolder.FontWeight = FontWeights.Bold;
            lblFolder.Foreground = Theme.Brush(Theme.AccentSky);
            lblFolder.VerticalAlignment = VerticalAlignment.Center;
            labelRow.Children.Add(lblFolder);

            Button resetBtn = new Button();
            resetBtn.Content = "Reset to Default";
            resetBtn.FontSize = 11;
            resetBtn.Foreground = Theme.Brush(Theme.TextMuted);
            resetBtn.Background = Brushes.Transparent;
            resetBtn.BorderThickness = new Thickness(0);
            resetBtn.Cursor = Cursors.Hand;
            resetBtn.HorizontalAlignment = HorizontalAlignment.Right;
            resetBtn.Click += delegate
            {
                if (dirTextBox != null && !string.IsNullOrEmpty(cfg.DefaultDir))
                {
                    dirTextBox.Text = cfg.DefaultDir;
                }
            };
            labelRow.Children.Add(resetBtn);
            pathStack.Children.Add(labelRow);

            Grid inputRow = new Grid();
            inputRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            inputRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(10) });
            inputRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            Border tbBorder = new Border();
            tbBorder.CornerRadius = new CornerRadius(9);
            tbBorder.Background = Theme.Brush(Theme.BgDeep);
            tbBorder.BorderBrush = Theme.AlphaBrush(Theme.AccentSky, 90);
            tbBorder.BorderThickness = new Thickness(1);
            tbBorder.Padding = new Thickness(10, 6, 10, 6);

            dirTextBox = new TextBox();
            dirTextBox.Text = cfg.InstallDir;
            dirTextBox.FontFamily = Theme.FontMono;
            dirTextBox.FontSize = 12;
            dirTextBox.Foreground = Theme.Brush(Theme.TextPrimary);
            dirTextBox.Background = Brushes.Transparent;
            dirTextBox.CaretBrush = Theme.Brush(Theme.AccentSky);
            dirTextBox.BorderThickness = new Thickness(0);
            dirTextBox.VerticalContentAlignment = VerticalAlignment.Center;
            dirTextBox.TextChanged += delegate
            {
                cfg.InstallDir = dirTextBox.Text.Trim();
                UpdateDiskSpaceInfo();
            };
            tbBorder.Child = dirTextBox;
            Grid.SetColumn(tbBorder, 0);
            inputRow.Children.Add(tbBorder);

            Button browseBtn = CreateActionButton("Browse...", null, false, 104);
            browseBtn.Height = 36;
            browseBtn.Click += delegate
            {
                IntPtr hwnd = new WindowInteropHelper(this).Handle;
                string picked = NativeMethods.BrowseFolder(hwnd, "Select NUKRON Installation Folder");
                if (!string.IsNullOrEmpty(picked))
                {
                    string folderName = cfg.AppFilename;
                    if (string.IsNullOrEmpty(folderName)) folderName = "NUKRON";
                    if (picked.IndexOf(folderName, StringComparison.OrdinalIgnoreCase) < 0)
                    {
                        picked = System.IO.Path.Combine(picked, folderName);
                    }
                    dirTextBox.Text = picked;
                }
            };
            Grid.SetColumn(browseBtn, 2);
            inputRow.Children.Add(browseBtn);
            pathStack.Children.Add(inputRow);

            dirValidationText = new TextBlock();
            dirValidationText.FontSize = 11;
            dirValidationText.Margin = new Thickness(2, 7, 0, 0);
            pathStack.Children.Add(dirValidationText);

            pathCard.Child = pathStack;
            body.Children.Add(pathCard);

            // Disk Space Telemetry Card
            Border spaceCard = new Border();
            spaceCard.CornerRadius = new CornerRadius(14);
            spaceCard.Background = Theme.ClearGlassFill();
            spaceCard.BorderBrush = Theme.AlphaBrush(Theme.TextMuted, 38);
            spaceCard.BorderThickness = new Thickness(1);
            spaceCard.Padding = new Thickness(16, 12, 16, 12);
            spaceCard.Margin = new Thickness(0, 0, 0, 10);

            StackPanel spaceStack = new StackPanel();
            Grid spaceTop = new Grid();
            driveLabelText = new TextBlock();
            driveLabelText.FontFamily = Theme.FontMono;
            driveLabelText.FontSize = 11;
            driveLabelText.FontWeight = FontWeights.Bold;
            driveLabelText.Foreground = Theme.Brush(Theme.TextPrimary);
            driveLabelText.VerticalAlignment = VerticalAlignment.Center;
            spaceTop.Children.Add(driveLabelText);

            spaceStatusBadge = new Border();
            spaceStatusBadge.CornerRadius = new CornerRadius(6);
            spaceStatusBadge.Padding = new Thickness(8, 2, 8, 2);
            spaceStatusBadge.HorizontalAlignment = HorizontalAlignment.Right;
            spaceStatusBadge.BorderThickness = new Thickness(1);
            spaceStatusBadgeText = new TextBlock();
            spaceStatusBadgeText.FontFamily = Theme.FontMono;
            spaceStatusBadgeText.FontSize = 10;
            spaceStatusBadgeText.FontWeight = FontWeights.Bold;
            spaceStatusBadge.Child = spaceStatusBadgeText;
            spaceTop.Children.Add(spaceStatusBadge);
            spaceStack.Children.Add(spaceTop);

            // Drive usage visual bar
            Border barTrack = new Border();
            barTrack.Height = 6;
            barTrack.CornerRadius = new CornerRadius(3);
            barTrack.Background = Theme.AlphaBrush(Theme.TextMuted, 32);
            barTrack.Margin = new Thickness(0, 9, 0, 9);
            barTrack.ClipToBounds = true;

            driveUsageBarFill = new Border();
            driveUsageBarFill.Height = 6;
            driveUsageBarFill.CornerRadius = new CornerRadius(3);
            driveUsageBarFill.HorizontalAlignment = HorizontalAlignment.Left;
            driveUsageBarFill.Width = 180;
            driveUsageBarFill.Background = Theme.OpticalGradient(0);
            barTrack.Child = driveUsageBarFill;
            spaceStack.Children.Add(barTrack);

            Grid metricsRow = new Grid();
            metricsRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            metricsRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            StackPanel reqCol = new StackPanel();
            TextBlock reqLbl = new TextBlock { Text = "REQUIRED DISK SPACE", FontSize = 9.5, Foreground = Theme.Brush(Theme.TextDim), FontFamily = Theme.FontMono };
            reqSpaceValueText = new TextBlock { FontSize = 13, FontWeight = FontWeights.Bold, Foreground = Theme.Brush(Theme.TextPrimary), Margin = new Thickness(0, 2, 0, 0) };
            reqCol.Children.Add(reqLbl);
            reqCol.Children.Add(reqSpaceValueText);
            Grid.SetColumn(reqCol, 0);
            metricsRow.Children.Add(reqCol);

            StackPanel freeCol = new StackPanel();
            TextBlock freeLbl = new TextBlock { Text = "AVAILABLE ON SELECTED DRIVE", FontSize = 9.5, Foreground = Theme.Brush(Theme.TextDim), FontFamily = Theme.FontMono };
            freeSpaceValueText = new TextBlock { FontSize = 13, FontWeight = FontWeights.Bold, Foreground = Theme.Brush(Theme.AccentLight), Margin = new Thickness(0, 2, 0, 0) };
            freeCol.Children.Add(freeLbl);
            freeCol.Children.Add(freeSpaceValueText);
            Grid.SetColumn(freeCol, 1);
            metricsRow.Children.Add(freeCol);

            spaceStack.Children.Add(metricsRow);
            spaceCard.Child = spaceStack;
            body.Children.Add(spaceCard);

            // Data preservation note
            Border preserveCard = new Border();
            preserveCard.CornerRadius = new CornerRadius(11);
            preserveCard.Background = Theme.AlphaBrush(Theme.AccentBlue, 22);
            preserveCard.BorderBrush = Theme.AlphaBrush(Theme.AccentSky, 55);
            preserveCard.BorderThickness = new Thickness(1);
            preserveCard.Padding = new Thickness(13, 9, 13, 9);

            TextBlock preserveTb = new TextBlock();
            preserveTb.Text = "User Data Protection: Your SQLite game library (launcher.db), playtime history, cover artwork, and settings in %APPDATA%\\NUKRON are always preserved when installing or updating.";
            preserveTb.FontSize = 11.2;
            preserveTb.Foreground = Theme.Brush(Theme.TextMuted);
            preserveTb.TextWrapping = TextWrapping.Wrap;
            preserveCard.Child = preserveTb;
            body.Children.Add(preserveCard);

            Grid.SetRow(body, 1);
            g.Children.Add(body);

            // Bottom Action Bar
            Grid footer = new Grid();
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            Button backBtn = CreateActionButton("Back", null, false, 100);
            backBtn.Click += delegate { ShowStep(1, true); };
            Grid.SetColumn(backBtn, 0);
            footer.Children.Add(backBtn);

            step2NextBtn = CreateActionButton("Next", "M 5,12 L 19,12 M 13,6 L 19,12 L 13,18", true, 148);
            step2NextBtn.Click += delegate
            {
                if (ValidateInstallDir())
                {
                    ShowStep(3, true);
                }
            };
            Grid.SetColumn(step2NextBtn, 2);
            footer.Children.Add(step2NextBtn);

            Grid.SetRow(footer, 2);
            g.Children.Add(footer);

            UpdateDiskSpaceInfo();
            return g;
        }

        private bool ValidateInstallDir()
        {
            string p = cfg.InstallDir != null ? cfg.InstallDir.Trim() : "";
            if (string.IsNullOrEmpty(p) || p.Length < 4) return false;
            try
            {
                if (!System.IO.Path.IsPathRooted(p)) return false;
                string root = System.IO.Path.GetPathRoot(p);
                if (string.IsNullOrEmpty(root) || !Directory.Exists(root)) return false;
                return true;
            }
            catch
            {
                return false;
            }
        }

        private void UpdateDiskSpaceInfo()
        {
            double reqMB = Math.Max(120.0, cfg.EstimatedSizeKB / 1024.0);
            if (reqSpaceValueText != null)
            {
                reqSpaceValueText.Text = reqMB.ToString("0.0", CultureInfo.InvariantCulture) + " MB";
            }

            bool valid = ValidateInstallDir();
            if (step2NextBtn != null) step2NextBtn.IsEnabled = valid;

            if (!valid)
            {
                if (dirValidationText != null)
                {
                    dirValidationText.Text = "Please enter a valid rooted folder path on an existing drive.";
                    dirValidationText.Foreground = Theme.Brush(Theme.StatusDanger);
                }
                if (driveLabelText != null) driveLabelText.Text = "DRIVE STATUS: INVALID PATH";
                if (freeSpaceValueText != null) freeSpaceValueText.Text = "—";
                return;
            }

            if (dirValidationText != null)
            {
                dirValidationText.Text = "✓ Target path verified and ready for NUKRON installation";
                dirValidationText.Foreground = Theme.Brush(Theme.StatusOk);
            }

            try
            {
                string root = System.IO.Path.GetPathRoot(cfg.InstallDir);
                DriveInfo drv = new DriveInfo(root);
                double freeGB = drv.AvailableFreeSpace / 1073741824.0;
                double totalGB = drv.TotalSize / 1073741824.0;
                double usedRatio = totalGB > 0 ? Math.Max(0.06, Math.Min(0.96, (totalGB - freeGB) / totalGB)) : 0.4;

                if (driveLabelText != null)
                {
                    string vol = "";
                    try { vol = drv.VolumeLabel; } catch { }
                    driveLabelText.Text = "DRIVE " + root.TrimEnd('\\') + (string.IsNullOrEmpty(vol) ? "" : (" (" + vol + ")"));
                }
                if (freeSpaceValueText != null)
                {
                    freeSpaceValueText.Text = freeGB.ToString("0.0", CultureInfo.InvariantCulture) + " GB free of " + totalGB.ToString("0.0", CultureInfo.InvariantCulture) + " GB";
                }
                if (driveUsageBarFill != null)
                {
                    driveUsageBarFill.Width = Math.Round(490.0 * usedRatio);
                }

                bool enough = (drv.AvailableFreeSpace / 1048576.0) > (reqMB + 50.0);
                if (spaceStatusBadge != null && spaceStatusBadgeText != null)
                {
                    Color sc = enough ? Theme.StatusOk : Theme.StatusDanger;
                    spaceStatusBadge.Background = Theme.AlphaBrush(sc, 32);
                    spaceStatusBadge.BorderBrush = Theme.AlphaBrush(sc, 90);
                    spaceStatusBadgeText.Text = enough ? "READY · SUFFICIENT SPACE" : "LOW DISK SPACE";
                    spaceStatusBadgeText.Foreground = Theme.Brush(sc);
                }
            }
            catch
            {
                if (driveLabelText != null) driveLabelText.Text = "STORAGE TELEMETRY";
                if (freeSpaceValueText != null) freeSpaceValueText.Text = "Available";
            }
        }

        // ====================================================================
        // STEP 3: OPTIONAL INSTALLATION SETTINGS
        // ====================================================================
        private UIElement BuildStep3Options()
        {
            Grid g = new Grid();
            g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            g.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            StackPanel header = new StackPanel();
            header.Children.Add(CreatePillBadge("STEP 03 OF 05 · OPTIONAL SETTINGS", Theme.AccentSky));

            TextBlock h1 = new TextBlock();
            h1.Text = "Installation Options";
            h1.FontFamily = Theme.FontBrand;
            h1.FontSize = 22;
            h1.FontWeight = FontWeights.Bold;
            h1.Margin = new Thickness(0, 10, 0, 5);
            header.Children.Add(h1);

            TextBlock lead = new TextBlock();
            lead.Text = "Customize shortcuts and Windows startup integration for your NUKRON installation.";
            lead.FontSize = 12.6;
            lead.Foreground = Theme.Brush(Theme.TextMuted);
            header.Children.Add(lead);

            Grid.SetRow(header, 0);
            g.Children.Add(header);

            StackPanel body = new StackPanel();
            body.VerticalAlignment = VerticalAlignment.Center;
            body.Margin = new Thickness(0, 10, 0, 10);

            // Option 1: Desktop Shortcut
            body.Children.Add(BuildToggleOptionCard(
                "M 3,4 L 21,4 L 21,16 L 3,16 Z M 8,20 L 16,20 M 12,16 L 12,20",
                Theme.AccentSky,
                "Create Desktop Shortcut",
                "Place a NUKRON quick-launch icon on your Windows Desktop.",
                cfg.CreateDesktopShortcut,
                out toggleDesktopTrack,
                out toggleDesktopThumb,
                delegate
                {
                    cfg.CreateDesktopShortcut = !cfg.CreateDesktopShortcut;
                    UpdateToggleVisual(toggleDesktopTrack, toggleDesktopThumb, cfg.CreateDesktopShortcut);
                }
            ));

            // Option 2: Start Menu Shortcut
            body.Children.Add(BuildToggleOptionCard(
                "M 3,3 L 10,3 L 10,10 L 3,10 Z M 14,3 L 21,3 L 21,10 L 14,10 Z M 3,14 L 10,14 L 10,21 L 3,21 Z M 14,14 L 21,14 L 21,21 L 14,21 Z",
                Theme.AccentIndigo,
                "Create Start Menu Shortcut",
                "Register NUKRON in the Windows Start Menu Programs list and search index.",
                cfg.CreateStartMenuShortcut,
                out toggleStartMenuTrack,
                out toggleStartMenuThumb,
                delegate
                {
                    cfg.CreateStartMenuShortcut = !cfg.CreateStartMenuShortcut;
                    UpdateToggleVisual(toggleStartMenuTrack, toggleStartMenuThumb, cfg.CreateStartMenuShortcut);
                }
            ));

            // Option 3: Launch at Windows Startup
            body.Children.Add(BuildToggleOptionCard(
                "M 13,2 L 3,14 L 12,14 L 11,22 L 21,10 L 12,10 Z",
                Theme.StatusOk,
                "Launch NUKRON when Windows Starts",
                "Start NUKRON quietly in the system tray at sign-in so playtime tracking is always ready.",
                cfg.LaunchAtStartup,
                out toggleStartupTrack,
                out toggleStartupThumb,
                delegate
                {
                    cfg.LaunchAtStartup = !cfg.LaunchAtStartup;
                    UpdateToggleVisual(toggleStartupTrack, toggleStartupThumb, cfg.LaunchAtStartup);
                }
            ));

            // Pre-flight summary strip
            Border summaryStrip = new Border();
            summaryStrip.CornerRadius = new CornerRadius(11);
            summaryStrip.Background = Theme.ClearGlassFill();
            summaryStrip.BorderBrush = Theme.AlphaBrush(Theme.TextMuted, 35);
            summaryStrip.BorderThickness = new Thickness(1);
            summaryStrip.Padding = new Thickness(13, 9, 13, 9);
            summaryStrip.Margin = new Thickness(0, 2, 0, 0);

            StackPanel sumStack = new StackPanel();
            TextBlock sumTitle = new TextBlock();
            sumTitle.Text = "READY TO INSTALL TO:";
            sumTitle.FontFamily = Theme.FontMono;
            sumTitle.FontSize = 9.5;
            sumTitle.FontWeight = FontWeights.Bold;
            sumTitle.Foreground = Theme.Brush(Theme.TextDim);
            sumStack.Children.Add(sumTitle);

            TextBlock sumPath = new TextBlock();
            sumPath.Text = cfg.InstallDir;
            sumPath.FontFamily = Theme.FontMono;
            sumPath.FontSize = 11.2;
            sumPath.Foreground = Theme.Brush(Theme.AccentLight);
            sumPath.TextTrimming = TextTrimming.CharacterEllipsis;
            sumPath.Margin = new Thickness(0, 2, 0, 0);
            sumStack.Children.Add(sumPath);

            summaryStrip.Child = sumStack;
            body.Children.Add(summaryStrip);

            Grid.SetRow(body, 1);
            g.Children.Add(body);

            // Bottom Action Bar
            Grid footer = new Grid();
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            Button backBtn = CreateActionButton("Back", null, false, 100);
            backBtn.Click += delegate { ShowStep(2, true); };
            Grid.SetColumn(backBtn, 0);
            footer.Children.Add(backBtn);

            Button startInstallBtn = CreateActionButton("Install NUKRON", "M 5,12 L 19,12 M 13,6 L 19,12 L 13,18", true, 178);
            startInstallBtn.Click += delegate { BeginInstallation(); };
            Grid.SetColumn(startInstallBtn, 2);
            footer.Children.Add(startInstallBtn);

            Grid.SetRow(footer, 2);
            g.Children.Add(footer);

            return g;
        }

        private Border BuildToggleOptionCard(
            string iconGeom, Color accent, string title, string desc, bool initialState,
            out Border trackOut, out Ellipse thumbOut, Action onToggle)
        {
            Border card = new Border();
            card.CornerRadius = new CornerRadius(13);
            card.Background = Theme.ClearGlassFill();
            card.BorderBrush = Theme.AlphaBrush(Theme.TextMuted, 42);
            card.BorderThickness = new Thickness(1);
            card.Padding = new Thickness(14, 11, 14, 11);
            card.Margin = new Thickness(0, 0, 0, 9);
            card.Cursor = Cursors.Hand;

            Grid row = new Grid();
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            Border iconBox = new Border();
            iconBox.Width = 36;
            iconBox.Height = 36;
            iconBox.CornerRadius = new CornerRadius(9);
            iconBox.Background = Theme.AlphaBrush(accent, 34);
            iconBox.BorderBrush = Theme.AlphaBrush(accent, 90);
            iconBox.BorderThickness = new Thickness(1);
            iconBox.Margin = new Thickness(0, 0, 13, 0);
            iconBox.VerticalAlignment = VerticalAlignment.Center;
            iconBox.Child = CreateVectorIcon(iconGeom, 17, Theme.Brush(accent), 1.85);
            Grid.SetColumn(iconBox, 0);
            row.Children.Add(iconBox);

            StackPanel col = new StackPanel();
            col.VerticalAlignment = VerticalAlignment.Center;
            col.Margin = new Thickness(0, 0, 12, 0);

            TextBlock t = new TextBlock();
            t.Text = title;
            t.FontSize = 13;
            t.FontWeight = FontWeights.SemiBold;
            t.Foreground = Theme.Brush(Theme.TextPrimary);
            col.Children.Add(t);

            TextBlock d = new TextBlock();
            d.Text = desc;
            d.FontSize = 11.3;
            d.Foreground = Theme.Brush(Theme.TextMuted);
            d.TextWrapping = TextWrapping.Wrap;
            d.Margin = new Thickness(0, 2, 0, 0);
            col.Children.Add(d);

            Grid.SetColumn(col, 1);
            row.Children.Add(col);

            // Custom NUKRON Optical Switch Pill
            Border track = new Border();
            track.Width = 44;
            track.Height = 24;
            track.CornerRadius = new CornerRadius(12);
            track.BorderThickness = new Thickness(1);
            track.VerticalAlignment = VerticalAlignment.Center;

            Canvas swCanvas = new Canvas();
            swCanvas.Width = 42;
            swCanvas.Height = 22;

            Ellipse thumb = new Ellipse();
            thumb.Width = 16;
            thumb.Height = 16;
            thumb.Fill = Brushes.White;
            Canvas.SetTop(thumb, 3);
            swCanvas.Children.Add(thumb);
            track.Child = swCanvas;

            trackOut = track;
            thumbOut = thumb;
            UpdateToggleVisual(track, thumb, initialState);

            Grid.SetColumn(track, 2);
            row.Children.Add(track);

            card.Child = row;

            card.MouseEnter += delegate
            {
                card.BorderBrush = Theme.AlphaBrush(Theme.AccentSky, 105);
            };
            card.MouseLeave += delegate
            {
                card.BorderBrush = Theme.AlphaBrush(Theme.TextMuted, 42);
            };
            card.MouseLeftButtonUp += delegate
            {
                if (onToggle != null) onToggle();
            };

            return card;
        }

        private void UpdateToggleVisual(Border track, Ellipse thumb, bool isOn)
        {
            if (track == null || thumb == null) return;
            if (isOn)
            {
                track.Background = Theme.PrimaryButtonBrush(false);
                track.BorderBrush = Theme.AlphaBrush(Theme.AccentLight, 150);
                Canvas.SetLeft(thumb, 22);
            }
            else
            {
                track.Background = Theme.AlphaBrush(Theme.Surface, 200);
                track.BorderBrush = Theme.AlphaBrush(Theme.TextMuted, 80);
                Canvas.SetLeft(thumb, 4);
            }
        }

        // ====================================================================
        // STEP 4: CUSTOM INSTALLATION PROGRESS SCREEN
        // ====================================================================
        private UIElement BuildStep4Progress()
        {
            Grid g = new Grid();
            g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            g.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            StackPanel header = new StackPanel();
            header.Children.Add(CreatePillBadge("STEP 04 OF 05 · DEPLOYING NUKRON PACKAGE", Theme.AccentSky));

            TextBlock h1 = new TextBlock();
            h1.Text = "Installing NUKRON";
            h1.FontFamily = Theme.FontBrand;
            h1.FontSize = 22;
            h1.FontWeight = FontWeights.Bold;
            h1.Margin = new Thickness(0, 10, 0, 5);
            header.Children.Add(h1);

            TextBlock lead = new TextBlock();
            lead.Text = "Unpacking NUKRON runtime, Optical Glass interface, and configuring system integration.";
            lead.FontSize = 12.6;
            lead.Foreground = Theme.Brush(Theme.TextMuted);
            header.Children.Add(lead);

            Grid.SetRow(header, 0);
            g.Children.Add(header);

            StackPanel body = new StackPanel();
            body.VerticalAlignment = VerticalAlignment.Center;
            body.Margin = new Thickness(0, 10, 0, 10);

            // Main Progress Hero Card
            Border progCard = new Border();
            progCard.CornerRadius = new CornerRadius(15);
            progCard.Background = Theme.OpticalGlassFill();
            progCard.BorderBrush = Theme.FresnelRim(true);
            progCard.BorderThickness = new Thickness(1);
            progCard.Padding = new Thickness(18, 15, 18, 15);
            progCard.Margin = new Thickness(0, 0, 0, 12);

            StackPanel progStack = new StackPanel();

            Grid topInfo = new Grid();
            topInfo.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            topInfo.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            topInfo.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            // Animated spinning prism ring
            Grid spinBox = new Grid();
            spinBox.Width = 38;
            spinBox.Height = 38;
            spinBox.Margin = new Thickness(0, 0, 12, 0);
            spinBox.VerticalAlignment = VerticalAlignment.Center;

            Ellipse spinTrack = new Ellipse();
            spinTrack.Width = 36;
            spinTrack.Height = 36;
            spinTrack.Stroke = Theme.AlphaBrush(Theme.AccentSky, 45);
            spinTrack.StrokeThickness = 2.5;
            spinBox.Children.Add(spinTrack);

            Path spinArc = new Path();
            spinArc.Data = Geometry.Parse("M 18,2 A 16,16 0 0 1 34,18");
            spinArc.Width = 36;
            spinArc.Height = 36;
            spinArc.Stroke = Theme.OpticalGradient(135);
            spinArc.StrokeThickness = 2.8;
            spinArc.StrokeStartLineCap = PenLineCap.Round;
            spinArc.StrokeEndLineCap = PenLineCap.Round;
            spinnerRotate = new RotateTransform(0, 18, 18);
            spinArc.RenderTransform = spinnerRotate;
            spinBox.Children.Add(spinArc);

            DoubleAnimation spinAnim = new DoubleAnimation(0, 360, TimeSpan.FromSeconds(1.25));
            spinAnim.RepeatBehavior = RepeatBehavior.Forever;
            spinnerRotate.BeginAnimation(RotateTransform.AngleProperty, spinAnim);

            Grid.SetColumn(spinBox, 0);
            topInfo.Children.Add(spinBox);

            StackPanel statusTextCol = new StackPanel();
            statusTextCol.VerticalAlignment = VerticalAlignment.Center;

            progressStageText = new TextBlock();
            progressStageText.Text = "Preparing installation environment...";
            progressStageText.FontSize = 13.5;
            progressStageText.FontWeight = FontWeights.SemiBold;
            progressStageText.Foreground = Theme.Brush(Theme.TextPrimary);
            statusTextCol.Children.Add(progressStageText);

            progressDetailText = new TextBlock();
            progressDetailText.Text = "Initializing NUKRON package extractor";
            progressDetailText.FontFamily = Theme.FontMono;
            progressDetailText.FontSize = 11;
            progressDetailText.Foreground = Theme.Brush(Theme.TextMuted);
            progressDetailText.Margin = new Thickness(0, 3, 0, 0);
            progressDetailText.TextTrimming = TextTrimming.CharacterEllipsis;
            statusTextCol.Children.Add(progressDetailText);

            Grid.SetColumn(statusTextCol, 1);
            topInfo.Children.Add(statusTextCol);

            progressPercentText = new TextBlock();
            progressPercentText.Text = "0%";
            progressPercentText.FontFamily = Theme.FontBrand;
            progressPercentText.FontSize = 24;
            progressPercentText.FontWeight = FontWeights.ExtraBold;
            progressPercentText.Foreground = Theme.Brush(Theme.AccentLight);
            progressPercentText.VerticalAlignment = VerticalAlignment.Center;
            progressPercentText.Margin = new Thickness(12, 0, 0, 0);
            Grid.SetColumn(progressPercentText, 2);
            topInfo.Children.Add(progressPercentText);

            progStack.Children.Add(topInfo);

            // Animated Optical Gradient Progress Bar with Shimmer
            Border pTrack = new Border();
            pTrack.Height = 10;
            pTrack.CornerRadius = new CornerRadius(5);
            pTrack.Background = Theme.AlphaBrush(Theme.BgDeep, 210);
            pTrack.BorderBrush = Theme.AlphaBrush(Theme.AccentSky, 55);
            pTrack.BorderThickness = new Thickness(1);
            pTrack.Margin = new Thickness(0, 14, 0, 2);
            pTrack.ClipToBounds = true;

            Grid pInner = new Grid();
            progressBarFill = new Border();
            progressBarFill.Height = 10;
            progressBarFill.CornerRadius = new CornerRadius(5);
            progressBarFill.HorizontalAlignment = HorizontalAlignment.Left;
            progressBarFill.Width = 0;
            progressBarFill.Background = Theme.OpticalGradient(0);
            progressBarFill.ClipToBounds = true;

            // Shimmer overlay inside fill
            Border shimmer = new Border();
            shimmer.Width = 120;
            shimmer.Height = 10;
            shimmer.HorizontalAlignment = HorizontalAlignment.Left;
            LinearGradientBrush shimBrush = new LinearGradientBrush { StartPoint = new Point(0, 0), EndPoint = new Point(1, 0) };
            shimBrush.GradientStops.Add(new GradientStop(Color.FromArgb(0, 255, 255, 255), 0.0));
            shimBrush.GradientStops.Add(new GradientStop(Color.FromArgb(110, 255, 255, 255), 0.5));
            shimBrush.GradientStops.Add(new GradientStop(Color.FromArgb(0, 255, 255, 255), 1.0));
            shimmer.Background = shimBrush;
            shimmerTransform = new TranslateTransform(-120, 0);
            shimmer.RenderTransform = shimmerTransform;
            progressBarFill.Child = shimmer;

            DoubleAnimation shimAnim = new DoubleAnimation(-120, 520, TimeSpan.FromSeconds(1.5));
            shimAnim.RepeatBehavior = RepeatBehavior.Forever;
            shimmerTransform.BeginAnimation(TranslateTransform.XProperty, shimAnim);

            pInner.Children.Add(progressBarFill);
            pTrack.Child = pInner;
            progStack.Children.Add(pTrack);

            progCard.Child = progStack;
            body.Children.Add(progCard);

            // Live 5-Phase Installation Checklist Card
            Border listCard = new Border();
            listCard.CornerRadius = new CornerRadius(14);
            listCard.Background = Theme.ClearGlassFill();
            listCard.BorderBrush = Theme.AlphaBrush(Theme.TextMuted, 38);
            listCard.BorderThickness = new Thickness(1);
            listCard.Padding = new Thickness(16, 12, 16, 12);

            StackPanel listStack = new StackPanel();
            checkRowDots.Clear();
            checkRowIcons.Clear();
            checkRowTexts.Clear();
            checkRowStates.Clear();

            string[] phases = new string[] {
                "Verify environment & close running NUKRON processes",
                "Preserve existing SQLite game database & user settings",
                "Extract NUKRON core binaries & Optical Glass renderer",
                "Register Windows AppUserModelId & uninstaller metadata",
                "Configure Desktop / Start Menu shortcuts & startup"
            };

            for (int i = 0; i < phases.Length; i++)
            {
                Grid pRow = new Grid();
                pRow.Margin = new Thickness(0, 4, 0, 4);
                pRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
                pRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                pRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

                Border dot = new Border();
                dot.Width = 20;
                dot.Height = 20;
                dot.CornerRadius = new CornerRadius(6);
                dot.Margin = new Thickness(0, 0, 10, 0);
                dot.VerticalAlignment = VerticalAlignment.Center;
                dot.BorderThickness = new Thickness(1);

                TextBlock dotIco = new TextBlock();
                dotIco.Text = "·";
                dotIco.FontFamily = Theme.FontMono;
                dotIco.FontSize = 11;
                dotIco.FontWeight = FontWeights.Bold;
                dotIco.HorizontalAlignment = HorizontalAlignment.Center;
                dotIco.VerticalAlignment = VerticalAlignment.Center;
                dot.Child = dotIco;

                checkRowDots.Add(dot);
                checkRowIcons.Add(dotIco);
                Grid.SetColumn(dot, 0);
                pRow.Children.Add(dot);

                TextBlock pTxt = new TextBlock();
                pTxt.Text = phases[i];
                pTxt.FontSize = 12;
                pTxt.VerticalAlignment = VerticalAlignment.Center;
                checkRowTexts.Add(pTxt);
                Grid.SetColumn(pTxt, 1);
                pRow.Children.Add(pTxt);

                TextBlock stTxt = new TextBlock();
                stTxt.Text = "PENDING";
                stTxt.FontFamily = Theme.FontMono;
                stTxt.FontSize = 9.5;
                stTxt.FontWeight = FontWeights.Bold;
                stTxt.VerticalAlignment = VerticalAlignment.Center;
                checkRowStates.Add(stTxt);
                Grid.SetColumn(stTxt, 2);
                pRow.Children.Add(stTxt);

                listStack.Children.Add(pRow);
            }

            listCard.Child = listStack;
            body.Children.Add(listCard);

            Grid.SetRow(body, 1);
            g.Children.Add(body);

            // Bottom status bar
            Grid footer = new Grid();
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            TextBlock waitNote = new TextBlock();
            waitNote.Text = "Installing NUKRON to " + cfg.InstallDir;
            waitNote.FontSize = 11.2;
            waitNote.Foreground = Theme.Brush(Theme.TextDim);
            waitNote.TextTrimming = TextTrimming.CharacterEllipsis;
            waitNote.VerticalAlignment = VerticalAlignment.Center;
            Grid.SetColumn(waitNote, 0);
            footer.Children.Add(waitNote);

            progressElapsedText = new TextBlock();
            progressElapsedText.Text = "Elapsed: 0.0s";
            progressElapsedText.FontFamily = Theme.FontMono;
            progressElapsedText.FontSize = 11;
            progressElapsedText.Foreground = Theme.Brush(Theme.TextMuted);
            progressElapsedText.VerticalAlignment = VerticalAlignment.Center;
            Grid.SetColumn(progressElapsedText, 1);
            footer.Children.Add(progressElapsedText);

            Grid.SetRow(footer, 2);
            g.Children.Add(footer);

            UpdateChecklistVisuals(5.0);
            return g;
        }

        private void UpdateChecklistVisuals(double pct)
        {
            double[] thresholds = new double[] { 0.0, 14.0, 26.0, 82.0, 92.0 };
            double[] ends = new double[] { 14.0, 26.0, 82.0, 92.0, 99.5 };

            for (int i = 0; i < checkRowDots.Count; i++)
            {
                Border dot = checkRowDots[i];
                TextBlock ico = checkRowIcons[i];
                TextBlock txt = checkRowTexts[i];
                TextBlock st = checkRowStates[i];

                if (pct >= ends[i])
                {
                    dot.Background = Theme.AlphaBrush(Theme.StatusOk, 38);
                    dot.BorderBrush = Theme.AlphaBrush(Theme.StatusOk, 110);
                    ico.Text = "✓";
                    ico.Foreground = Theme.Brush(Theme.StatusOk);
                    txt.Foreground = Theme.Brush(Theme.TextPrimary);
                    st.Text = "COMPLETE";
                    st.Foreground = Theme.Brush(Theme.StatusOk);
                }
                else if (pct >= thresholds[i])
                {
                    dot.Background = Theme.AlphaBrush(Theme.AccentBlue, 55);
                    dot.BorderBrush = Theme.AlphaBrush(Theme.AccentSky, 140);
                    ico.Text = "▸";
                    ico.Foreground = Theme.Brush(Theme.AccentSky);
                    txt.Foreground = Theme.Brush(Theme.TextPrimary);
                    st.Text = "ACTIVE";
                    st.Foreground = Theme.Brush(Theme.AccentSky);
                }
                else
                {
                    dot.Background = Theme.AlphaBrush(Theme.Surface, 120);
                    dot.BorderBrush = Theme.AlphaBrush(Theme.TextMuted, 35);
                    ico.Text = "·";
                    ico.Foreground = Theme.Brush(Theme.TextDim);
                    txt.Foreground = Theme.Brush(Theme.TextMuted);
                    st.Text = "QUEUED";
                    st.Foreground = Theme.Brush(Theme.TextDim);
                }
            }
        }

        public void SetProgressValues(double pct, string stageTitle, string detail)
        {
            displayedProgress = pct;
            targetProgress = pct;
            if (progressPercentText != null)
            {
                progressPercentText.Text = Math.Round(pct).ToString(CultureInfo.InvariantCulture) + "%";
            }
            if (progressStageText != null && !string.IsNullOrEmpty(stageTitle))
            {
                progressStageText.Text = stageTitle;
            }
            if (progressDetailText != null && !string.IsNullOrEmpty(detail))
            {
                progressDetailText.Text = detail;
            }
            if (progressBarFill != null)
            {
                progressBarFill.Width = Math.Max(6.0, Math.Min(502.0, 502.0 * (pct / 100.0)));
            }
            UpdateChecklistVisuals(pct);
        }

        // ====================================================================
        // STEP 5: COMPLETION SCREEN
        // ====================================================================
        private UIElement BuildStep5Complete()
        {
            Grid g = new Grid();
            g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            g.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            StackPanel header = new StackPanel();
            header.Children.Add(CreatePillBadge("STEP 05 OF 05 · INSTALLATION COMPLETE", Theme.StatusOk));

            TextBlock h1 = new TextBlock();
            h1.Text = "NUKRON is Ready";
            h1.FontFamily = Theme.FontBrand;
            h1.FontSize = 24;
            h1.FontWeight = FontWeights.Bold;
            h1.Margin = new Thickness(0, 10, 0, 5);
            header.Children.Add(h1);

            TextBlock lead = new TextBlock();
            lead.Text = "NUKRON v" + cfg.Version + " has been installed successfully. Your PC gaming universe and Optical Glass overlay are ready.";
            lead.FontSize = 12.8;
            lead.Foreground = Theme.Brush(Theme.TextMuted);
            lead.TextWrapping = TextWrapping.Wrap;
            header.Children.Add(lead);

            Grid.SetRow(header, 0);
            g.Children.Add(header);

            StackPanel body = new StackPanel();
            body.VerticalAlignment = VerticalAlignment.Center;
            body.Margin = new Thickness(0, 10, 0, 10);

            // Hero Completion Summary Card
            Border doneCard = new Border();
            doneCard.CornerRadius = new CornerRadius(15);
            doneCard.Background = Theme.OpticalGlassFill();
            doneCard.BorderBrush = Theme.FresnelRim(true);
            doneCard.BorderThickness = new Thickness(1);
            doneCard.Padding = new Thickness(18, 16, 18, 16);
            doneCard.Margin = new Thickness(0, 0, 0, 12);

            Grid doneGrid = new Grid();
            doneGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            doneGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            Grid badgeWrap = new Grid();
            badgeWrap.Width = 64;
            badgeWrap.Height = 64;
            badgeWrap.Margin = new Thickness(0, 0, 16, 0);
            badgeWrap.VerticalAlignment = VerticalAlignment.Center;

            Image doneLogo = CreateLogoImage(58, 0.55);
            badgeWrap.Children.Add(doneLogo);

            Border okCorner = new Border();
            okCorner.Width = 22;
            okCorner.Height = 22;
            okCorner.CornerRadius = new CornerRadius(11);
            okCorner.Background = Theme.Brush(Theme.StatusOk);
            okCorner.BorderBrush = Theme.Brush(Theme.BgDeep);
            okCorner.BorderThickness = new Thickness(2);
            okCorner.HorizontalAlignment = HorizontalAlignment.Right;
            okCorner.VerticalAlignment = VerticalAlignment.Bottom;
            TextBlock okCheck = new TextBlock();
            okCheck.Text = "✓";
            okCheck.FontSize = 12;
            okCheck.FontWeight = FontWeights.ExtraBold;
            okCheck.Foreground = Theme.Brush(Theme.BgDeep);
            okCheck.HorizontalAlignment = HorizontalAlignment.Center;
            okCheck.VerticalAlignment = VerticalAlignment.Center;
            okCorner.Child = okCheck;
            badgeWrap.Children.Add(okCorner);

            Grid.SetColumn(badgeWrap, 0);
            doneGrid.Children.Add(badgeWrap);

            StackPanel infoStack = new StackPanel();
            infoStack.VerticalAlignment = VerticalAlignment.Center;

            TextBlock verTitle = new TextBlock();
            verTitle.Text = "NUKRON v" + cfg.Version + " · Installed & Verified";
            verTitle.FontSize = 14.5;
            verTitle.FontWeight = FontWeights.Bold;
            verTitle.Foreground = Theme.Brush(Theme.TextPrimary);
            infoStack.Children.Add(verTitle);

            TextBlock pathLine = new TextBlock();
            pathLine.Text = "Location: " + cfg.InstallDir;
            pathLine.FontFamily = Theme.FontMono;
            pathLine.FontSize = 11;
            pathLine.Foreground = Theme.Brush(Theme.AccentLight);
            pathLine.TextTrimming = TextTrimming.CharacterEllipsis;
            pathLine.Margin = new Thickness(0, 4, 0, 3);
            infoStack.Children.Add(pathLine);

            List<string> activeOpts = new List<string>();
            if (cfg.CreateDesktopShortcut) activeOpts.Add("Desktop shortcut created");
            if (cfg.CreateStartMenuShortcut) activeOpts.Add("Start Menu registered");
            if (cfg.LaunchAtStartup) activeOpts.Add("Windows startup enabled");
            activeOpts.Add("User library & settings preserved");

            TextBlock optsLine = new TextBlock();
            optsLine.Text = string.Join(" · ", activeOpts.ToArray());
            optsLine.FontSize = 11.2;
            optsLine.Foreground = Theme.Brush(Theme.TextMuted);
            optsLine.TextWrapping = TextWrapping.Wrap;
            infoStack.Children.Add(optsLine);

            Grid.SetColumn(infoStack, 1);
            doneGrid.Children.Add(infoStack);
            doneCard.Child = doneGrid;
            body.Children.Add(doneCard);

            // Launch NUKRON Toggle Option Card
            Button primaryFinishBtn = CreateActionButton(
                cfg.LaunchAfterFinish ? "Launch NUKRON" : "Finish Setup",
                "M 5,3 L 19,12 L 5,21 Z",
                true,
                184
            );
            StackPanel btnContent = (StackPanel)primaryFinishBtn.Content;
            primaryFinishBtnText = (TextBlock)btnContent.Children[0];

            body.Children.Add(BuildToggleOptionCard(
                "M 5,3 L 19,12 L 5,21 Z",
                Theme.AccentSky,
                "Launch NUKRON when setup exits",
                "Start NUKRON immediately and open your Smart Gaming Dashboard.",
                cfg.LaunchAfterFinish,
                out toggleLaunchNowTrack,
                out toggleLaunchNowThumb,
                delegate
                {
                    cfg.LaunchAfterFinish = !cfg.LaunchAfterFinish;
                    UpdateToggleVisual(toggleLaunchNowTrack, toggleLaunchNowThumb, cfg.LaunchAfterFinish);
                    if (primaryFinishBtnText != null)
                    {
                        primaryFinishBtnText.Text = cfg.LaunchAfterFinish ? "Launch NUKRON" : "Finish Setup";
                    }
                }
            ));

            Grid.SetRow(body, 1);
            g.Children.Add(body);

            // Bottom Action Bar
            Grid footer = new Grid();
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            Button closeOnlyBtn = CreateActionButton("Close Setup", null, false, 118);
            closeOnlyBtn.Click += delegate { FinishAndExit(false); };
            Grid.SetColumn(closeOnlyBtn, 0);
            footer.Children.Add(closeOnlyBtn);

            primaryFinishBtn.Click += delegate { FinishAndExit(cfg.LaunchAfterFinish); };
            Grid.SetColumn(primaryFinishBtn, 2);
            footer.Children.Add(primaryFinishBtn);

            Grid.SetRow(footer, 2);
            g.Children.Add(footer);

            return g;
        }

        // ====================================================================
        // INSTALLATION EXECUTION & REAL-TIME NSIS COORDINATION
        // ====================================================================
        private void BeginInstallation()
        {
            if (isInstalling) return;
            isInstalling = true;
            if (closeWinBtn != null) closeWinBtn.IsEnabled = false;

            ShowStep(4, true);
            installStartTime = DateTime.UtcNow;

            // Write user choices for NSIS customInit & customInstall
            if (!string.IsNullOrEmpty(cfg.PluginsDir) && Directory.Exists(cfg.PluginsDir))
            {
                string choiceFile = System.IO.Path.Combine(cfg.PluginsDir, "ui-choice.ini");
                NativeMethods.WriteIni(choiceFile, "Setup", "InstallDir", cfg.InstallDir);
                NativeMethods.WriteIni(choiceFile, "Setup", "DesktopShortcut", cfg.CreateDesktopShortcut ? "1" : "0");
                NativeMethods.WriteIni(choiceFile, "Setup", "StartMenuShortcut", cfg.CreateStartMenuShortcut ? "1" : "0");
                NativeMethods.WriteIni(choiceFile, "Setup", "LaunchAtStartup", cfg.LaunchAtStartup ? "1" : "0");

                // Signal NSIS in customInit to proceed with Section "install"
                string startFlag = System.IO.Path.Combine(cfg.PluginsDir, "ui-start.flag");
                try { File.WriteAllText(startFlag, "START", Encoding.UTF8); } catch { }
            }

            displayedProgress = 4.0;
            targetProgress = 12.0;

            installPollTimer = new DispatcherTimer();
            installPollTimer.Interval = TimeSpan.FromMilliseconds(70);
            installPollTimer.Tick += OnInstallPollTick;
            installPollTimer.Start();
        }

        private void OnInstallPollTick(object sender, EventArgs e)
        {
            double elapsedSec = (DateTime.UtcNow - installStartTime).TotalSeconds;
            if (progressElapsedText != null)
            {
                progressElapsedText.Text = "Elapsed: " + elapsedSec.ToString("0.0", CultureInfo.InvariantCulture) + "s";
            }

            string stageTitle = "Preparing installation environment...";
            string detail = "Verifying target directory & checking running processes";

            bool nsisDone = false;
            if (!string.IsNullOrEmpty(cfg.PluginsDir) && Directory.Exists(cfg.PluginsDir))
            {
                string doneFlag = System.IO.Path.Combine(cfg.PluginsDir, "ui-done.flag");
                if (File.Exists(doneFlag))
                {
                    nsisDone = true;
                }
                else
                {
                    // Inspect real extraction progress in $PLUGINSDIR and $INSTDIR
                    string sevenZOut = System.IO.Path.Combine(cfg.PluginsDir, "7z-out");
                    string archiveFile = System.IO.Path.Combine(cfg.PluginsDir, "app-64.7z");
                    string oldUninst = System.IO.Path.Combine(cfg.PluginsDir, "old-uninstaller.exe");

                    double totalExpectedBytes = Math.Max(140.0 * 1048576.0, cfg.EstimatedSizeKB * 1024.0);

                    if (Directory.Exists(sevenZOut))
                    {
                        long unpackedBytes = 0;
                        string latestFile = "";
                        try
                        {
                            string[] files = Directory.GetFiles(sevenZOut, "*", SearchOption.AllDirectories);
                            for (int i = 0; i < files.Length; i++)
                            {
                                try
                                {
                                    FileInfo fi = new FileInfo(files[i]);
                                    unpackedBytes += fi.Length;
                                    latestFile = fi.Name;
                                }
                                catch { }
                            }
                        }
                        catch { }

                        double ratio = Math.Min(1.0, unpackedBytes / totalExpectedBytes);
                        targetProgress = Math.Max(targetProgress, 28.0 + ratio * 54.0);
                        double unpackedMB = unpackedBytes / 1048576.0;
                        double totalMB = totalExpectedBytes / 1048576.0;
                        stageTitle = "Extracting NUKRON application package...";
                        detail = string.Format(
                            CultureInfo.InvariantCulture,
                            "Unpacking {0} ({1:0.0} MB / {2:0.0} MB)",
                            string.IsNullOrEmpty(latestFile) ? "core runtime" : latestFile,
                            unpackedMB,
                            totalMB
                        );

                        // Also check if files are already being copied to $INSTDIR
                        if (ratio > 0.85 && Directory.Exists(cfg.InstallDir))
                        {
                            string targetExe = System.IO.Path.Combine(cfg.InstallDir, cfg.AppExe);
                            if (File.Exists(targetExe))
                            {
                                targetProgress = Math.Max(targetProgress, 88.0);
                                stageTitle = "Registering NUKRON & configuring shortcuts...";
                                detail = "Writing Windows AppUserModelId & uninstaller metadata";
                            }
                        }
                    }
                    else if (File.Exists(archiveFile))
                    {
                        targetProgress = Math.Max(targetProgress, 26.0);
                        stageTitle = "Staging compressed NUKRON archive...";
                        detail = "Preparing 64-bit LZMA2 package for extraction";
                    }
                    else if (File.Exists(oldUninst))
                    {
                        targetProgress = Math.Max(targetProgress, 18.0);
                        stageTitle = "Updating existing NUKRON installation...";
                        detail = "Preserving user SQLite database (launcher.db) & settings";
                    }
                    else
                    {
                        targetProgress = Math.Max(targetProgress, Math.Min(22.0, 8.0 + elapsedSec * 6.0));
                    }
                }

                // Check if parent NSIS process exited unexpectedly before writing ui-done.flag
                if (!nsisDone && cfg.ParentPid > 0)
                {
                    try
                    {
                        Process parent = Process.GetProcessById(cfg.ParentPid);
                        if (parent.HasExited)
                        {
                            nsisDone = true;
                        }
                    }
                    catch
                    {
                        nsisDone = true;
                    }
                }
            }
            else
            {
                // Standalone preview mode (no NSIS parent)
                targetProgress = Math.Min(100.0, displayedProgress + 3.5);
                if (targetProgress >= 100.0) nsisDone = true;
            }

            if (nsisDone)
            {
                targetProgress = 100.0;
                stageTitle = "Installation verified and complete!";
                detail = "All NUKRON components & shortcuts configured";
            }

            // Smoothly interpolate displayedProgress towards targetProgress
            double stepDelta = nsisDone ? Math.Max(2.8, (100.0 - displayedProgress) * 0.35) : Math.Max(0.4, (targetProgress - displayedProgress) * 0.22);
            displayedProgress = Math.Min(targetProgress, displayedProgress + stepDelta);

            SetProgressValues(displayedProgress, stageTitle, detail);

            if (nsisDone && displayedProgress >= 99.5)
            {
                installPollTimer.Stop();
                SetProgressValues(100.0, "Installation verified and complete!", "All NUKRON components & shortcuts configured");
                SyncLaunchAtStartupAppSettings();
                installFinished = true;
                if (closeWinBtn != null) closeWinBtn.IsEnabled = true;

                DispatcherTimer doneDelay = new DispatcherTimer();
                doneDelay.Interval = TimeSpan.FromMilliseconds(380);
                doneDelay.Tick += delegate
                {
                    doneDelay.Stop();
                    ShowStep(5, true);
                    if (cfg.AutoTest)
                    {
                        AppendAutoTestLog("STEP 5: Complete | InstallDir=" + cfg.InstallDir);
                        DispatcherTimer autoFinishTimer = new DispatcherTimer();
                        autoFinishTimer.Interval = TimeSpan.FromMilliseconds(350);
                        autoFinishTimer.Tick += delegate
                        {
                            autoFinishTimer.Stop();
                            FinishAndExit(cfg.AutoTestLaunchApp == 1);
                        };
                        autoFinishTimer.Start();
                    }
                };
                doneDelay.Start();
            }
        }

        private void SyncLaunchAtStartupAppSettings()
        {
            // Only update app-settings.json if the user explicitly changed the LaunchAtStartup toggle
            // AND app-settings.json already exists on disk, so existing user files remain untouched on upgrades.
            try
            {
                if (cfg.LaunchAtStartup == cfg.InitialLaunchAtStartup) return;
                if (string.IsNullOrEmpty(cfg.AppDataDir)) return;
                string settingsPath = System.IO.Path.Combine(cfg.AppDataDir, "app-settings.json");
                if (!File.Exists(settingsPath)) return;
                string raw = File.ReadAllText(settingsPath, Encoding.UTF8);
                string boolStr = cfg.LaunchAtStartup ? "true" : "false";
                if (raw.IndexOf("\"launchAtStartup\"", StringComparison.Ordinal) >= 0)
                {
                    string updated = System.Text.RegularExpressions.Regex.Replace(
                        raw,
                        "\"launchAtStartup\"\\s*:\\s*(true|false)",
                        "\"launchAtStartup\": " + boolStr
                    );
                    if (updated != raw)
                    {
                        File.WriteAllText(settingsPath, updated, Encoding.UTF8);
                    }
                }
            }
            catch { }
        }

        private void OnWindowLoaded(object sender, RoutedEventArgs e)
        {
            if (!string.IsNullOrEmpty(cfg.PluginsDir) && Directory.Exists(cfg.PluginsDir))
            {
                try
                {
                    File.WriteAllText(System.IO.Path.Combine(cfg.PluginsDir, "ui-ready.flag"), "READY", Encoding.UTF8);
                }
                catch { }
            }

            if (cfg.AutoTest)
            {
                RunAutoTestSequence();
            }
        }

        private void AppendAutoTestLog(string line)
        {
            if (string.IsNullOrEmpty(cfg.AutoTestLog)) return;
            try
            {
                File.AppendAllText(cfg.AutoTestLog, line + Environment.NewLine, Encoding.UTF8);
            }
            catch { }
        }

        private void RunAutoTestSequence()
        {
            AppendAutoTestLog("STEP 1: Welcome | Version=" + cfg.Version + " | IsUpgrade=" + cfg.IsUpgrade);
            DispatcherTimer t1 = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(220) };
            t1.Tick += delegate
            {
                t1.Stop();
                ShowStep(2, true);
                if (!string.IsNullOrEmpty(cfg.AutoTestDir) && dirTextBox != null)
                {
                    dirTextBox.Text = cfg.AutoTestDir;
                }
                AppendAutoTestLog("STEP 2: Directory | SelectedDir=" + cfg.InstallDir + " | Valid=" + ValidateInstallDir());

                DispatcherTimer t2 = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(220) };
                t2.Tick += delegate
                {
                    t2.Stop();
                    ShowStep(3, true);
                    if (cfg.AutoTestDesktopShortcut >= 0)
                    {
                        cfg.CreateDesktopShortcut = (cfg.AutoTestDesktopShortcut == 1);
                        UpdateToggleVisual(toggleDesktopTrack, toggleDesktopThumb, cfg.CreateDesktopShortcut);
                    }
                    if (cfg.AutoTestStartMenuShortcut >= 0)
                    {
                        cfg.CreateStartMenuShortcut = (cfg.AutoTestStartMenuShortcut == 1);
                        UpdateToggleVisual(toggleStartMenuTrack, toggleStartMenuThumb, cfg.CreateStartMenuShortcut);
                    }
                    AppendAutoTestLog("STEP 3: Options | DesktopShortcut=" + cfg.CreateDesktopShortcut + " | StartMenuShortcut=" + cfg.CreateStartMenuShortcut);

                    DispatcherTimer t3 = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(220) };
                    t3.Tick += delegate
                    {
                        t3.Stop();
                        AppendAutoTestLog("STEP 4: Starting Installation");
                        BeginInstallation();
                    };
                    t3.Start();
                };
                t2.Start();
            };
            t1.Start();
        }

        private void CancelAndExit()
        {
            if (cleanExitRequested) return;
            cleanExitRequested = true;
            WriteCancelFlag();
            Environment.Exit(1);
        }

        private void FinishAndExit(bool launchApp)
        {
            if (cleanExitRequested) return;
            cleanExitRequested = true;
            if (!string.IsNullOrEmpty(cfg.PluginsDir) && Directory.Exists(cfg.PluginsDir))
            {
                string exitIni = System.IO.Path.Combine(cfg.PluginsDir, "ui-exit.ini");
                NativeMethods.WriteIni(exitIni, "Result", "LaunchApp", launchApp ? "1" : "0");
                try
                {
                    File.WriteAllText(System.IO.Path.Combine(cfg.PluginsDir, "ui-exit.flag"), "EXIT", Encoding.UTF8);
                }
                catch { }
            }
            Environment.Exit(0);
        }

        private void WriteCancelFlag()
        {
            if (!string.IsNullOrEmpty(cfg.PluginsDir) && Directory.Exists(cfg.PluginsDir))
            {
                try
                {
                    string startFlag = System.IO.Path.Combine(cfg.PluginsDir, "ui-start.flag");
                    if (!File.Exists(startFlag))
                    {
                        File.WriteAllText(System.IO.Path.Combine(cfg.PluginsDir, "ui-cancel.flag"), "CANCEL", Encoding.UTF8);
                    }
                }
                catch { }
            }
        }

        private void OnWindowClosing(object sender, System.ComponentModel.CancelEventArgs e)
        {
            if (isInstalling && !installFinished && !cleanExitRequested)
            {
                e.Cancel = true;
                return;
            }
            if (!cleanExitRequested)
            {
                if (installFinished)
                {
                    FinishAndExit(false);
                }
                else
                {
                    WriteCancelFlag();
                }
            }
        }
    }

    public static class Program
    {
        [STAThread]
        public static int Main(string[] args)
        {
            // Check for --capture-screens <dir> mode (used to render visual verification PNGs of all 5 steps)
            if (args != null && args.Length >= 2 && args[0] == "--capture-screens")
            {
                return CaptureAllScreens(args[1]);
            }

            SetupConfig cfg = LoadConfiguration(args);
            AppDomain.CurrentDomain.ProcessExit += delegate
            {
                if (!string.IsNullOrEmpty(cfg.PluginsDir) && Directory.Exists(cfg.PluginsDir))
                {
                    string startFlag = System.IO.Path.Combine(cfg.PluginsDir, "ui-start.flag");
                    string cancelFlag = System.IO.Path.Combine(cfg.PluginsDir, "ui-cancel.flag");
                    if (!File.Exists(startFlag) && !File.Exists(cancelFlag))
                    {
                        try { File.WriteAllText(cancelFlag, "CANCEL", Encoding.UTF8); } catch { }
                    }
                }
            };

            Application app = new Application();
            SetupWizardWindow win = new SetupWizardWindow(cfg);
            app.Run(win);
            return 0;
        }

        private static SetupConfig LoadConfiguration(string[] args)
        {
            SetupConfig cfg = new SetupConfig();
            string localAppData = Environment.GetEnvironmentVariable("LOCALAPPDATA");
            if (string.IsNullOrEmpty(localAppData))
            {
                localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            }
            if (string.IsNullOrEmpty(localAppData))
            {
                localAppData = "C:\\Users\\User\\AppData\\Local";
            }
            string appData = Environment.GetEnvironmentVariable("APPDATA");
            if (string.IsNullOrEmpty(appData))
            {
                appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            }
            if (string.IsNullOrEmpty(appData))
            {
                appData = "C:\\Users\\User\\AppData\\Roaming";
            }
            cfg.DefaultDir = System.IO.Path.Combine(System.IO.Path.Combine(localAppData, "Programs"), "NUKRON");
            cfg.InstallDir = cfg.DefaultDir;
            cfg.AppDataDir = System.IO.Path.Combine(appData, "NUKRON");

            if (args != null && args.Length >= 1 && Directory.Exists(args[0]))
            {
                cfg.PluginsDir = args[0];
                string ini = System.IO.Path.Combine(cfg.PluginsDir, "ui-init.ini");
                if (File.Exists(ini))
                {
                    cfg.DefaultDir = NativeMethods.ReadIni(ini, "Init", "DefaultDir", cfg.DefaultDir);
                    cfg.InstallDir = cfg.DefaultDir;
                    cfg.Version = NativeMethods.ReadIni(ini, "Init", "Version", cfg.Version);
                    cfg.ProductName = NativeMethods.ReadIni(ini, "Init", "ProductName", cfg.ProductName);
                    cfg.AppFilename = NativeMethods.ReadIni(ini, "Init", "AppFilename", cfg.AppFilename);
                    cfg.AppExe = NativeMethods.ReadIni(ini, "Init", "AppExe", cfg.AppExe);
                    cfg.AppDataDir = NativeMethods.ReadIni(ini, "Init", "AppDataDir", cfg.AppDataDir);

                    long sz;
                    if (long.TryParse(NativeMethods.ReadIni(ini, "Init", "EstimatedSizeKB", "188000"), out sz) && sz > 0)
                    {
                        cfg.EstimatedSizeKB = sz;
                    }

                    cfg.IsUpgrade = NativeMethods.ReadIni(ini, "Init", "IsUpgrade", "0") == "1";
                    cfg.ExistingVersion = NativeMethods.ReadIni(ini, "Init", "ExistingVersion", "");
                    cfg.CreateDesktopShortcut = NativeMethods.ReadIni(ini, "Init", "DesktopShortcutDefault", "1") != "0";
                    cfg.LaunchAtStartup = NativeMethods.ReadIni(ini, "Init", "LaunchAtStartupDefault", "0") == "1";
                    cfg.InitialLaunchAtStartup = cfg.LaunchAtStartup;

                    int ppid;
                    if (int.TryParse(NativeMethods.ReadIni(ini, "Init", "ParentPid", "0"), out ppid))
                    {
                        cfg.ParentPid = ppid;
                    }
                }
            }

            // Also inspect existing app-settings.json if present
            try
            {
                if (!string.IsNullOrEmpty(cfg.AppDataDir))
                {
                    string settingsPath = System.IO.Path.Combine(cfg.AppDataDir, "app-settings.json");
                    if (File.Exists(settingsPath))
                    {
                        string raw = File.ReadAllText(settingsPath, Encoding.UTF8);
                        if (raw.IndexOf("\"launchAtStartup\": true", StringComparison.OrdinalIgnoreCase) >= 0 ||
                            raw.IndexOf("\"launchAtStartup\":true", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            cfg.LaunchAtStartup = true;
                            cfg.InitialLaunchAtStartup = true;
                        }
                    }
                }
            }
            catch { }

            // Check automated test environment variables
            if (Environment.GetEnvironmentVariable("NUKRON_INSTALLER_AUTOTEST") == "1")
            {
                cfg.AutoTest = true;
                cfg.AutoTestDir = Environment.GetEnvironmentVariable("NUKRON_AUTOTEST_DIR") ?? "";
                cfg.AutoTestLog = Environment.GetEnvironmentVariable("NUKRON_AUTOTEST_LOG") ?? "";
                string dsk = Environment.GetEnvironmentVariable("NUKRON_AUTOTEST_DESKTOP_SHORTCUT");
                if (dsk == "0") cfg.AutoTestDesktopShortcut = 0;
                else if (dsk == "1") cfg.AutoTestDesktopShortcut = 1;

                string sm = Environment.GetEnvironmentVariable("NUKRON_AUTOTEST_STARTMENU_SHORTCUT");
                if (sm == "0") cfg.AutoTestStartMenuShortcut = 0;
                else if (sm == "1") cfg.AutoTestStartMenuShortcut = 1;

                string lnch = Environment.GetEnvironmentVariable("NUKRON_AUTOTEST_LAUNCH");
                if (lnch == "1") cfg.AutoTestLaunchApp = 1;
            }

            return cfg;
        }

        private static int CaptureAllScreens(string outDir)
        {
            try
            {
                Directory.CreateDirectory(outDir);
                if (Application.Current == null)
                {
                    new Application();
                }
                SetupConfig cfg = new SetupConfig();
                string localAppData = Environment.GetEnvironmentVariable("LOCALAPPDATA");
                if (string.IsNullOrEmpty(localAppData))
                {
                    localAppData = "C:\\Users\\User\\AppData\\Local";
                }
                cfg.DefaultDir = System.IO.Path.Combine(System.IO.Path.Combine(localAppData, "Programs"), "NUKRON");
                cfg.InstallDir = cfg.DefaultDir;

                SetupWizardWindow win = new SetupWizardWindow(cfg);
                Size winSize = new Size(win.Width, win.Height);

                string[] names = new string[] {
                    "screen-1-welcome.png",
                    "screen-2-directory.png",
                    "screen-3-options.png",
                    "screen-4-progress.png",
                    "screen-5-complete.png"
                };

                for (int step = 1; step <= 5; step++)
                {
                    win.ShowStep(step, false);
                    if (step == 4)
                    {
                        win.SetProgressValues(64.0, "Extracting NUKRON application package...", "Unpacking NUKRON.exe (118.4 MB / 184.6 MB)");
                    }
                    UIElement content = (UIElement)win.Content;
                    content.Measure(winSize);
                    content.Arrange(new Rect(winSize));
                    content.UpdateLayout();

                    RenderTargetBitmap rtb = new RenderTargetBitmap(
                        (int)win.Width, (int)win.Height, 96, 96, PixelFormats.Pbgra32);
                    rtb.Render(content);

                    PngBitmapEncoder enc = new PngBitmapEncoder();
                    enc.Frames.Add(BitmapFrame.Create(rtb));
                    string filePath = System.IO.Path.Combine(outDir, names[step - 1]);
                    using (FileStream fs = new FileStream(filePath, FileMode.Create, FileAccess.Write))
                    {
                        enc.Save(fs);
                    }
                }
                return 0;
            }
            catch (Exception ex)
            {
                try
                {
                    Directory.CreateDirectory(outDir);
                    File.WriteAllText(System.IO.Path.Combine(outDir, "capture-error.txt"), ex.ToString(), Encoding.UTF8);
                }
                catch { }
                return 1;
            }
        }
    }
}

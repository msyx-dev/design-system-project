// @msyx-dev/react — Design System msyx.fr (React)
// v3.0.0-alpha.6 — PageHeader ajouté dans #276
export { Icon } from "./icons/Icon";
export type { IconProps, IconName } from "./icons/Icon";
export { Button } from "./components/Button/Button";
export type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
} from "./components/Button/Button";
export { UserMenu } from "./components/UserMenu/UserMenu";
export type { UserMenuProps } from "./components/UserMenu/UserMenu";
export { LoginScreen } from "./components/LoginScreen/LoginScreen";
export type {
  LoginScreenProps,
  LoginScreenVariant,
  LoginScreenProvider,
} from "./components/LoginScreen/LoginScreen";
export { ThemeToggle } from "./components/ThemeToggle/ThemeToggle";
export type { ThemeToggleProps } from "./components/ThemeToggle/ThemeToggle";
export { PageHeader } from "./components/PageHeader/PageHeader";
export type {
  PageHeaderProps,
  PageHeaderHeadingLevel,
} from "./components/PageHeader/PageHeader";
export { ToastProvider, useToast } from "./components/Toast/Toast";
export type {
  ToastType,
  ToastProviderProps,
  UseToastReturn,
} from "./components/Toast/Toast";
export { Modal } from "./components/Modal/Modal";
export type { ModalProps } from "./components/Modal/Modal";
export { Tabs } from "./components/Tabs/Tabs";
export type { TabsProps, TabItem } from "./components/Tabs/Tabs";
export { ActionMenu } from "./components/ActionMenu/ActionMenu";
export type {
  ActionMenuProps,
  ActionMenuItem,
} from "./components/ActionMenu/ActionMenu";
export { Input } from "./components/Input/Input";
export type { InputProps } from "./components/Input/Input";
export { Select } from "./components/Input/Select";
export type { SelectProps, SelectOption } from "./components/Input/Select";
export { Checkbox } from "./components/Input/Checkbox";
export type { CheckboxProps } from "./components/Input/Checkbox";
export { Radio } from "./components/Input/Radio";
export type { RadioProps } from "./components/Input/Radio";
export { Toggle } from "./components/Input/Toggle";
export type { ToggleProps } from "./components/Input/Toggle";
export { SegmentedControl } from "./components/SegmentedControl/SegmentedControl";
export type {
  SegmentedControlProps,
  SegmentedControlOption,
} from "./components/SegmentedControl/SegmentedControl";
export { ThemeSwitcher } from "./components/ThemeSwitcher/ThemeSwitcher";
export type { ThemeSwitcherProps } from "./components/ThemeSwitcher/ThemeSwitcher";
export {
  useTheme,
  DEFAULT_THEME_CONFIG,
} from "./components/ThemeSwitcher/useTheme";
export type {
  UseThemeReturn,
  ThemeConfig,
  ThemeModeConfig,
  ThemeName,
  ThemeMode,
} from "./components/ThemeSwitcher/useTheme";
export { Dropdown } from "./components/Dropdown/Dropdown";
export type {
  DropdownProps,
  DropdownOption,
  DropdownSingleProps,
  DropdownMultiProps,
} from "./components/Dropdown/Dropdown";
export { Slider } from "./components/Slider/Slider";
export type { SliderProps } from "./components/Slider/Slider";
export { NumberInput } from "./components/NumberInput/NumberInput";
export type { NumberInputProps } from "./components/NumberInput/NumberInput";
export { SearchInput } from "./components/SearchInput/SearchInput";
export type {
  SearchInputProps,
  SearchInputSuggestions,
  SearchInputSuggestionObject,
} from "./components/SearchInput/SearchInput";
export { TagInput } from "./components/TagInput/TagInput";
export type { TagInputProps } from "./components/TagInput/TagInput";
export { FileUpload } from "./components/FileUpload/FileUpload";
export type {
  FileUploadProps,
  FileUploadFileItem,
} from "./components/FileUpload/FileUpload";

// ─── Sprint 3 « Formulaires B » (v3.0.0-alpha.10) ───
export { OTPInput } from "./components/OTPInput/OTPInput";
export type { OTPInputProps } from "./components/OTPInput/OTPInput";
export { Quiz } from "./components/Quiz/Quiz";
export type {
  QuizProps,
  QuizQuestion,
  QuizOption,
} from "./components/Quiz/Quiz";
export { Poll } from "./components/Quiz/Poll";
export type {
  PollProps,
  PollQuestion,
  PollResult,
} from "./components/Quiz/Poll";
export { PasswordInput } from "./components/PasswordInput/PasswordInput";
export type { PasswordInputProps } from "./components/PasswordInput/PasswordInput";
export { ColorInput } from "./components/ColorInput/ColorInput";
export type {
  ColorInputProps,
  ColorInputPreset,
} from "./components/ColorInput/ColorInput";
export { TransferList } from "./components/TransferList/TransferList";
export type {
  TransferListProps,
  TransferListItem,
  TransferDirection,
} from "./components/TransferList/TransferList";
export { FormErrorSummary } from "./components/FormValidation/FormErrorSummary";
export type { FormErrorSummaryProps } from "./components/FormValidation/FormErrorSummary";
export {
  useFormValidation,
  DEFAULT_FR_MESSAGES,
} from "./hooks/useFormValidation";
export type {
  UseFormValidationOptions,
  UseFormValidationReturn,
  FrMessages,
  FormValidationError,
  FieldProps,
} from "./hooks/useFormValidation";

// ─── Lot Overlays + Data (v3.0.0-alpha.11) ───
export { Tooltip } from "./components/Tooltip/Tooltip";
export type {
  TooltipProps,
  TooltipPosition,
} from "./components/Tooltip/Tooltip";
export { Popover } from "./components/Popover/Popover";
export type {
  PopoverProps,
  PopoverPosition,
} from "./components/Popover/Popover";
export { Drawer } from "./components/Drawer/Drawer";
export type { DrawerProps } from "./components/Drawer/Drawer";
export { BottomSheet } from "./components/BottomSheet/BottomSheet";
export type { BottomSheetProps } from "./components/BottomSheet/BottomSheet";
export { FAB } from "./components/FAB/FAB";
export type { FabProps, FabAction } from "./components/FAB/FAB";
export { VersionBadge } from "./components/VersionBadge/VersionBadge";
export type { VersionBadgeProps } from "./components/VersionBadge/VersionBadge";
export { VersionNotes } from "./components/VersionNotes/VersionNotes";
export type {
  VersionNotesProps,
  ReleaseNote,
  Highlight,
  VersionNoteCategory,
} from "./components/VersionNotes/VersionNotes";
export { Progress, ProgressRing } from "./components/Progress/Progress";
export type {
  ProgressProps,
  ProgressRingProps,
} from "./components/Progress/Progress";
export { ProgressTracker } from "./components/ProgressTracker/ProgressTracker";
export type {
  ProgressTrackerProps,
  ProgressTrackerRing,
} from "./components/ProgressTracker/ProgressTracker";
export { Gauge } from "./components/Gauge/Gauge";
export type { GaugeProps } from "./components/Gauge/Gauge";
export { UsageMeter } from "./components/UsageMeter/UsageMeter";
export type {
  UsageMeterProps,
  UsageMeterVariant,
} from "./components/UsageMeter/UsageMeter";
export { ActivityFeed } from "./components/ActivityFeed/ActivityFeed";
export type {
  ActivityFeedProps,
  ActivityFeedItem,
  ActivityFilterChip,
} from "./components/ActivityFeed/ActivityFeed";
export { RiskMatrix } from "./components/RiskMatrix/RiskMatrix";
export type {
  RiskMatrixProps,
  RiskItem,
  RiskLevel,
} from "./components/RiskMatrix/RiskMatrix";
export { TreeView } from "./components/TreeView/TreeView";
export type { TreeViewProps, TreeNode } from "./components/TreeView/TreeView";
export { HeatmapCalendar } from "./components/HeatmapCalendar/HeatmapCalendar";
export type {
  HeatmapCalendarProps,
  HeatmapCell,
} from "./components/HeatmapCalendar/HeatmapCalendar";
export { VirtualList } from "./components/VirtualList/VirtualList";
export type { VirtualListProps } from "./components/VirtualList/VirtualList";
export {
  useChartReveal,
  useChartTooltip,
  useChart,
} from "./hooks/useChartReveal";
export type {
  UseChartRevealOptions,
  UseChartTooltipReturn,
  UseChartOptions,
  UseChartReturn,
} from "./hooks/useChartReveal";
export { useCountUp } from "./hooks/useCountUp";
export type { UseCountUpOptions, UseCountUpResult } from "./hooks/useCountUp";

// ─── Lot Feedback Core (v3.0.0-alpha.14) — #695 ───
export {
  UserFeedbackProvider,
  useUserFeedback,
} from "./components/UserFeedback/UserFeedbackProvider";
export type {
  UserFeedbackProviderProps,
  UseUserFeedbackReturn,
} from "./components/UserFeedback/UserFeedbackProvider";
export { UserFeedbackModal } from "./components/UserFeedback/UserFeedbackModal";
export type { UserFeedbackModalProps } from "./components/UserFeedback/UserFeedbackModal";
export { UserFeedbackButton } from "./components/UserFeedback/UserFeedbackButton";
export type { UserFeedbackButtonProps } from "./components/UserFeedback/UserFeedbackButton";
export type {
  UserFeedbackContextData,
  FeedbackFormValues,
  FeedbackType,
  FeedbackImpact,
  FeedbackEnv,
  FeedbackDevice,
  FeedbackUser,
  FeedbackSubmitHandler,
} from "./components/UserFeedback/types";
// #803 — réutilisable hors Modal (un consumer qui a son propre parcours d'upload
// n'a pas à réécrire le downscale + ré-encodage WebP : c'est le motif du ticket).
export {
  normalizeScreenshot,
  ScreenshotNormalizeError,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_DIMENSION,
} from "./components/UserFeedback/normalizeScreenshot";
export type {
  ScreenshotNormalizeConfig,
  ScreenshotFailureReason,
} from "./components/UserFeedback/normalizeScreenshot";
export { DataGrid } from "./components/DataGrid/DataGrid";
export type {
  DataGridProps,
  DataGridColumn,
} from "./components/DataGrid/DataGrid";

// ─── SiteHeader (v3.0.0-alpha.17) — #717 ───
export { NotificationBell } from "./components/NotificationBell/NotificationBell";
export type {
  NotificationBellProps,
  NotificationItem,
} from "./components/NotificationBell/NotificationBell";

// ─── SiteHeader (v3.0.0-alpha.18) — #716 ───
export { SiteHeader } from "./components/SiteHeader/SiteHeader";
export type {
  SiteHeaderProps,
  SiteHeaderIdentity,
  SiteHeaderFeedbackConfig,
} from "./components/SiteHeader/SiteHeader";

// ─── Graph (v3.0.0-alpha.22) — #676, I6-1 view-only ───
// ─── Graph presets + mode édition (v3.0.0-alpha.23) — #677, I6-2 ───
export { Graph } from "./components/Graph/Graph";
export type {
  GraphProps,
  GraphLayout,
  GraphLayoutOptions,
  GraphNode,
  GraphEdge,
  NodeTypeSpec,
  GraphHandle,
  GraphEngineModelChangeDetail,
} from "./components/Graph/Graph";
export { Mindmap } from "./components/Graph/Mindmap";
export type { MindmapProps } from "./components/Graph/Mindmap";
export { OrgChart } from "./components/Graph/OrgChart";
export type { OrgChartProps } from "./components/Graph/OrgChart";
export { DependencyMap } from "./components/Graph/DependencyMap";
export type { DependencyMapProps } from "./components/Graph/DependencyMap";

// ─── Overlays — ContextMenu (#468, milestone #41 « Parité React ») ───
export { ContextMenu } from "./components/ContextMenu/ContextMenu";
export type {
  ContextMenuProps,
  ContextMenuItem,
  ContextMenuItemEntry,
  ContextMenuDividerEntry,
  ContextMenuSubItem,
  ContextMenuSubmenu,
} from "./components/ContextMenu/ContextMenu";

// ─── Accordion — parité React (#461) ───
export { Accordion } from "./components/Accordion/Accordion";
export type {
  AccordionProps,
  AccordionItem,
  AccordionHeadingLevel,
} from "./components/Accordion/Accordion";

// ─── SplitButton — #600 (parité React) ───
export { SplitButton } from "./components/SplitButton/SplitButton";
export type {
  SplitButtonProps,
  SplitButtonVariant,
  SplitButtonItem,
  SplitButtonItemEntry,
  SplitButtonDividerEntry,
} from "./components/SplitButton/SplitButton";

// ─── MentionInput — #594 (parité React, epic #396) ───
export { MentionInput } from "./components/MentionInput/MentionInput";
export type {
  MentionInputProps,
  MentionSuggestions,
  MentionSuggestionObject,
} from "./components/MentionInput/MentionInput";

// ─── JsonViewer — #596 (parité React) ───
export { JsonViewer } from "./components/JsonViewer/JsonViewer";
export type {
  JsonViewerProps,
  JsonViewerNode,
  JsonPrimitive,
  JsonValue,
} from "./components/JsonViewer/JsonViewer";

// ─── SplitPane — #595 (parité React) ───
export { SplitPane } from "./components/SplitPane/SplitPane";
export type {
  SplitPaneProps,
  SplitPaneOrientation,
} from "./components/SplitPane/SplitPane";

// ─── Calendar — #760 (parité React) ───
export { Calendar } from "./components/Calendar/Calendar";
export type {
  CalendarProps,
  CalendarSingleProps,
  CalendarRangeProps,
  CalendarMode,
  CalendarDateRange,
  CalendarReferenceMonth,
  CalendarLegendItem,
} from "./components/Calendar/Calendar";

// ─── TimePicker — #761 (parité React) ───
export { TimePicker } from "./components/TimePicker/TimePicker";
export type {
  TimePickerProps,
  TimePickerFormat,
  TimePickerPeriod,
} from "./components/TimePicker/TimePicker";

// ─── Rail — #857 (nav verticale rétractable, .rail-* + .sidebar-link-disabled) ───
export { Rail } from "./components/Rail/Rail";
export type { RailProps, RailItem } from "./components/Rail/Rail";

// ─── Timeline — #852 (fil vertical à deux niveaux, entièrement contrôlé) ───
export { Timeline } from "./components/Timeline/Timeline";
export type {
  TimelineProps,
  TimelineGroup,
  TimelineGroupCount,
  TimelineItem,
} from "./components/Timeline/Timeline";

// ─── SortableList — #853 (réordonnancement souris/tactile/clavier, contrôlé) ───
export { SortableList } from "./components/SortableList/SortableList";
export type {
  SortableListProps,
  SortableListItem,
  SortableListItemId,
} from "./components/SortableList/SortableList";

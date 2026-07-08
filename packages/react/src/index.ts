// @msyx-dev/react — Design System msyx.fr (React)
// v3.0.0-alpha.6 — PageHeader ajouté dans #276
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
export type { QuizProps, QuizQuestion, QuizOption } from "./components/Quiz/Quiz";
export { Poll } from "./components/Quiz/Poll";
export type { PollProps, PollQuestion, PollResult } from "./components/Quiz/Poll";
export { PasswordInput } from "./components/PasswordInput/PasswordInput";
export type { PasswordInputProps } from "./components/PasswordInput/PasswordInput";
export { ColorInput } from "./components/ColorInput/ColorInput";
export type { ColorInputProps, ColorInputPreset } from "./components/ColorInput/ColorInput";
export { TransferList } from "./components/TransferList/TransferList";
export type {
  TransferListProps,
  TransferListItem,
  TransferDirection,
} from "./components/TransferList/TransferList";
export { FormErrorSummary } from "./components/FormValidation/FormErrorSummary";
export type { FormErrorSummaryProps } from "./components/FormValidation/FormErrorSummary";
export { useFormValidation, DEFAULT_FR_MESSAGES } from "./hooks/useFormValidation";
export type {
  UseFormValidationOptions,
  UseFormValidationReturn,
  FrMessages,
  FormValidationError,
  FieldProps,
} from "./hooks/useFormValidation";

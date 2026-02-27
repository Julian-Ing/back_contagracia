/**
 * Exportación centralizada de componentes UI
 */

export { Button, buttonVariants, type ButtonProps } from '@/shared/components/ui/button';
export { Input, type InputProps } from '@/shared/components/ui/input';
export { Label, type LabelProps } from '@/shared/components/ui/label';
export { Select, type SelectProps, type SelectOption } from '@/shared/components/ui/select';
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/shared/components/ui/card';
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@/shared/components/ui/table';
export { NumericInput, type NumericInputProps } from '@/shared/components/ui/numeric-input';
export { Textarea, type TextareaProps } from '@/shared/components/ui/textarea';
export { PhoneInput, type PhoneInputProps } from '@/shared/components/ui/phone-input';
export { NITInput, calcularDV, type NITInputProps } from '@/shared/components/ui/nit-input';
export {
  SearchableSelect,
  type SearchableSelectProps,
  type SearchableSelectOption,
} from '@/shared/components/ui/searchable-select';
export {
  AsyncSearchableSelect,
  type AsyncSearchableSelectProps,
  type AsyncSelectOption,
  type LoadOptionsResult,
} from '@/shared/components/ui/async-searchable-select';
export {
  AccountSelect,
  type AccountSelectProps,
  type AccountOption,
} from '@/shared/components/ui/account-select';
export {
  ThirdPartySelect,
  type ThirdPartySelectProps,
  type ThirdPartyOption,
} from '@/shared/components/ui/third-party-select';

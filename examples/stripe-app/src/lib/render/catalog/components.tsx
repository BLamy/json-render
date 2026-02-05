/**
 * Stripe UIXT Component Implementations
 *
 * Maps json-render catalog components to Stripe UI Extension SDK components.
 */
import type { FunctionComponent } from "react";
import type { ComponentRenderProps } from "@json-render/react";
import {
  Box,
  Badge as UIBadge,
  Banner as UIBanner,
  Button as UIButton,
  Checkbox as UICheckbox,
  DateField as UIDateField,
  Divider as UIDivider,
  Icon as UIIcon,
  Img as UIImg,
  Inline as UIInline,
  Link as UILink,
  List as UIList,
  ListItem as UIListItem,
  Menu as UIMenu,
  MenuGroup as UIMenuGroup,
  MenuItem as UIMenuItem,
  PropertyList as UIPropertyList,
  PropertyListItem as UIPropertyListItem,
  Radio as UIRadio,
  Select as UISelect,
  Spinner as UISpinner,
  Switch as UISwitch,
  TaskList as UITaskList,
  TaskListItem as UITaskListItem,
  TextArea as UITextArea,
  TextField as UITextField,
  Tooltip as UITooltip,
  Accordion as UIAccordion,
  AccordionItem as UIAccordionItem,
  BarChart as UIBarChart,
  LineChart as UILineChart,
  Sparkline as UISparkline,
  ButtonGroup as UIButtonGroup,
  Chip as UIChip,
  ChipList as UIChipList,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@stripe/ui-extension-sdk/ui";

// Helper to format currency
const formatCurrency = (amount: number, currency = "usd"): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

// Extended props type for components with data access
type ExtendedRenderProps<P = Record<string, unknown>> =
  ComponentRenderProps<P> & {
    data?: Record<string, unknown>;
    getValue?: (path: string) => unknown;
  };

// =========================================================================
// Layout Components
// =========================================================================
export const Stack: FunctionComponent<ExtendedRenderProps> = ({
  element,
  children,
}) => {
  const {
    direction = "vertical",
    gap = "medium",
    distribute,
  } = element.props as Record<string, unknown>;

  return (
    <Box
      css={{
        stack: direction === "horizontal" ? "x" : "y",
        gap: gap as "xsmall" | "small" | "medium" | "large" | "xlarge",
        ...(distribute === "space-between" && {
          distribute: "space-between" as const,
        }),
      }}
    >
      {children}
    </Box>
  );
};

export const Inline: FunctionComponent<ExtendedRenderProps> = ({
  children,
}) => {
  return <UIInline>{children}</UIInline>;
};

export const Divider: FunctionComponent<ExtendedRenderProps> = () => {
  return <UIDivider />;
};

export const Accordion: FunctionComponent<ExtendedRenderProps> = ({
  children,
}) => {
  return <UIAccordion>{children}</UIAccordion>;
};

export const AccordionItem: FunctionComponent<ExtendedRenderProps> = ({
  element,
  children,
}) => {
  const { title, subtitle, defaultOpen } = element.props as Record<
    string,
    unknown
  >;
  return (
    <UIAccordionItem
      title={String(title || "")}
      subtitle={subtitle ? String(subtitle) : undefined}
      defaultOpen={Boolean(defaultOpen) || undefined}
    >
      {children}
    </UIAccordionItem>
  );
};

// =========================================================================
// Typography Components
// =========================================================================
export const Heading: FunctionComponent<ExtendedRenderProps> = ({
  element,
}) => {
  const { text, size = "large" } = element.props as Record<string, unknown>;

  const fontMap: Record<
    string,
    "heading" | "title" | "subtitle" | "subheading" | "body"
  > = {
    xsmall: "body",
    small: "subheading",
    medium: "subtitle",
    large: "title",
    xlarge: "heading",
  };

  return (
    <Box css={{ font: fontMap[size as string] || "title", fontWeight: "bold" }}>
      {String(text || "")}
    </Box>
  );
};

export const Text: FunctionComponent<ExtendedRenderProps> = ({ element }) => {
  const {
    content,
    color = "primary",
    size = "medium",
    weight = "regular",
  } = element.props as Record<string, unknown>;

  const colorMap: Record<
    string,
    | "primary"
    | "secondary"
    | "disabled"
    | "critical"
    | "success"
    | "attention"
    | "info"
  > = {
    primary: "primary",
    secondary: "secondary",
    disabled: "disabled",
    critical: "critical",
    success: "success",
    warning: "attention",
    info: "info",
  };

  const fontMap: Record<string, "caption" | "body" | "subtitle" | "title"> = {
    xsmall: "caption",
    small: "caption",
    medium: "body",
    large: "subtitle",
  };

  const weightMap: Record<string, "regular" | "semibold" | "bold"> = {
    regular: "regular",
    medium: "regular",
    semibold: "semibold",
    bold: "bold",
  };

  return (
    <Box
      css={{
        font: fontMap[size as string] || "body",
        color: colorMap[color as string] || "primary",
        fontWeight: weightMap[weight as string] || "regular",
      }}
    >
      {String(content || "")}
    </Box>
  );
};

// =========================================================================
// Data Display Components
// =========================================================================
export const Metric: FunctionComponent<ExtendedRenderProps> = ({ element }) => {
  const {
    label,
    value,
    change,
    changeType = "neutral",
  } = element.props as Record<string, unknown>;

  const changeColors: Record<string, "success" | "critical" | "secondary"> = {
    positive: "success",
    negative: "critical",
    neutral: "secondary",
  };

  return (
    <Box css={{ stack: "y", gap: "xsmall" }}>
      <Box css={{ font: "caption", color: "secondary" }}>
        {String(label || "")}
      </Box>
      <Box css={{ font: "heading", fontWeight: "bold" }}>
        {String(value || "")}
      </Box>
      {change && (
        <Box
          css={{
            font: "caption",
            color: changeColors[changeType as string] || "secondary",
          }}
        >
          {changeType === "positive"
            ? "↑"
            : changeType === "negative"
              ? "↓"
              : ""}{" "}
          {String(change)}
        </Box>
      )}
    </Box>
  );
};

export const Badge: FunctionComponent<ExtendedRenderProps> = ({ element }) => {
  const { label, type = "neutral" } = element.props as Record<string, unknown>;
  return (
    <UIBadge
      type={
        type as
          | "neutral"
          | "urgent"
          | "warning"
          | "negative"
          | "positive"
          | "info"
      }
    >
      {String(label || "")}
    </UIBadge>
  );
};

export const Icon: FunctionComponent<ExtendedRenderProps> = ({ element }) => {
  const { name, size = "medium" } = element.props as Record<string, unknown>;
  const sizeMap: Record<string, "xsmall" | "small" | "medium" | "large"> = {
    xsmall: "xsmall",
    small: "small",
    medium: "medium",
    large: "large",
  };
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe UIXT Icon name type is complex
    <UIIcon name={name as any} size={sizeMap[size as string] || "medium"} />
  );
};

export const Img: FunctionComponent<ExtendedRenderProps> = ({ element }) => {
  const { src, alt, width, height } = element.props as Record<string, unknown>;
  return (
    <UIImg
      src={String(src || "")}
      alt={String(alt || "")}
      width={width as number | undefined}
      height={height as number | undefined}
    />
  );
};

export const Spinner: FunctionComponent<ExtendedRenderProps> = ({
  element,
}) => {
  const { size = "medium" } = element.props as Record<string, unknown>;
  return <UISpinner size={size as "small" | "medium" | "large"} />;
};

// =========================================================================
// Feedback Components
// =========================================================================
export const Banner: FunctionComponent<ExtendedRenderProps> = ({ element }) => {
  const {
    title,
    description,
    type = "default",
  } = element.props as Record<string, unknown>;
  return (
    <UIBanner
      title={title ? String(title) : undefined}
      description={description ? String(description) : undefined}
      type={type as "default" | "caution" | "critical"}
    />
  );
};

// =========================================================================
// List Components
// =========================================================================
export const List: FunctionComponent<ExtendedRenderProps> = ({
  children,
  onAction,
}) => {
  return (
    <UIList
      onAction={
        onAction
          ? (id) => onAction({ name: "listItemAction", params: { id } })
          : undefined
      }
    >
      {children}
    </UIList>
  );
};

export const ListItem: FunctionComponent<ExtendedRenderProps> = ({
  element,
}) => {
  const {
    title,
    secondaryTitle,
    value,
    id,
    size = "default",
  } = element.props as Record<string, unknown>;
  return (
    <UIListItem
      title={<Box>{String(title || "")}</Box>}
      secondaryTitle={
        secondaryTitle ? <Box>{String(secondaryTitle)}</Box> : undefined
      }
      value={value ? <Box>{String(value)}</Box> : undefined}
      id={id ? String(id) : undefined}
      size={size as "default" | "large"}
    />
  );
};

export const PropertyList: FunctionComponent<ExtendedRenderProps> = ({
  element,
  children,
}) => {
  const { orientation = "vertical" } = element.props as Record<string, unknown>;
  return (
    <UIPropertyList orientation={orientation as "vertical" | "horizontal"}>
      {children}
    </UIPropertyList>
  );
};

export const PropertyListItem: FunctionComponent<ExtendedRenderProps> = ({
  element,
}) => {
  const { label, value } = element.props as Record<string, unknown>;
  return (
    <UIPropertyListItem
      label={String(label || "")}
      value={String(value || "")}
    />
  );
};

export const TaskList: FunctionComponent<ExtendedRenderProps> = ({
  children,
}) => {
  return <UITaskList>{children}</UITaskList>;
};

export const TaskListItem: FunctionComponent<ExtendedRenderProps> = ({
  element,
  onAction,
}) => {
  const {
    title,
    status = "not-started",
    action,
  } = element.props as Record<string, unknown>;
  return (
    <UITaskListItem
      title={String(title || "")}
      status={status as "not-started" | "in-progress" | "blocked" | "complete"}
      onPress={
        action && onAction
          ? () => onAction({ name: String(action) })
          : undefined
      }
    />
  );
};

// =========================================================================
// Menu Components
// =========================================================================
export const Menu: FunctionComponent<ExtendedRenderProps> = ({
  element,
  children,
  onAction,
}) => {
  const { triggerLabel } = element.props as Record<string, unknown>;
  return (
    <UIMenu
      trigger={
        <UIButton type="secondary">{String(triggerLabel || "Menu")}</UIButton>
      }
      onAction={
        onAction
          ? (id) => onAction({ name: "menuAction", params: { id } })
          : undefined
      }
    >
      {children}
    </UIMenu>
  );
};

export const MenuItem: FunctionComponent<ExtendedRenderProps> = ({
  element,
  onAction,
}) => {
  const { label, id, disabled, action } = element.props as Record<
    string,
    unknown
  >;
  return (
    <UIMenuItem
      id={String(id || "")}
      disabled={Boolean(disabled) || undefined}
      onAction={
        action && onAction
          ? () => onAction({ name: String(action) })
          : undefined
      }
    >
      {String(label || "")}
    </UIMenuItem>
  );
};

export const MenuGroup: FunctionComponent<ExtendedRenderProps> = ({
  children,
}) => {
  return <UIMenuGroup>{children}</UIMenuGroup>;
};

// =========================================================================
// Form Components
// =========================================================================
export const TextField: FunctionComponent<ExtendedRenderProps> = ({
  element,
  getValue,
}) => {
  const {
    label,
    placeholder,
    description,
    error,
    valuePath,
    size = "medium",
    disabled,
    required,
  } = element.props as Record<string, unknown>;
  const value =
    getValue && valuePath ? (getValue(String(valuePath)) as string) : "";

  return (
    <UITextField
      label={String(label || "")}
      placeholder={placeholder ? String(placeholder) : undefined}
      description={description ? String(description) : undefined}
      error={error ? String(error) : undefined}
      value={value || ""}
      size={size as "small" | "medium" | "large"}
      disabled={Boolean(disabled) || undefined}
      required={Boolean(required) || undefined}
      onChange={() => undefined}
    />
  );
};

export const TextArea: FunctionComponent<ExtendedRenderProps> = ({
  element,
  getValue,
}) => {
  const {
    label,
    placeholder,
    description,
    error,
    valuePath,
    rows = 3,
    disabled,
    required,
  } = element.props as Record<string, unknown>;
  const value =
    getValue && valuePath ? (getValue(String(valuePath)) as string) : "";

  return (
    <UITextArea
      label={String(label || "")}
      placeholder={placeholder ? String(placeholder) : undefined}
      description={description ? String(description) : undefined}
      error={error ? String(error) : undefined}
      value={value || ""}
      rows={Number(rows)}
      disabled={Boolean(disabled) || undefined}
      required={Boolean(required) || undefined}
      onChange={() => undefined}
    />
  );
};

export const Select: FunctionComponent<ExtendedRenderProps> = ({
  element,
  getValue,
}) => {
  const {
    label,
    description,
    error,
    valuePath,
    options = [],
    size = "medium",
    disabled,
    required,
  } = element.props as Record<string, unknown>;
  const value =
    getValue && valuePath ? (getValue(String(valuePath)) as string) : "";
  const opts = options as Array<{ value: string; label: string }>;

  return (
    <UISelect
      label={String(label || "")}
      description={description ? String(description) : undefined}
      error={error ? String(error) : undefined}
      value={value || ""}
      size={size as "small" | "medium" | "large"}
      disabled={Boolean(disabled) || undefined}
      required={Boolean(required) || undefined}
      onChange={() => undefined}
    >
      {opts.map((opt: { value: string; label: string }) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </UISelect>
  );
};

export const Checkbox: FunctionComponent<ExtendedRenderProps> = ({
  element,
  getValue,
}) => {
  const { label, description, error, valuePath, defaultChecked, disabled } =
    element.props as Record<string, unknown>;
  const checked =
    getValue && valuePath
      ? (getValue(String(valuePath)) as boolean)
      : Boolean(defaultChecked);

  return (
    <UICheckbox
      label={String(label || "")}
      description={description ? String(description) : undefined}
      error={error ? String(error) : undefined}
      checked={checked || undefined}
      disabled={Boolean(disabled) || undefined}
      onChange={() => undefined}
    />
  );
};

export const Radio: FunctionComponent<ExtendedRenderProps> = ({
  element,
  getValue,
}) => {
  const { label, description, valuePath, value, name, disabled } =
    element.props as Record<string, unknown>;
  const currentValue =
    getValue && valuePath ? (getValue(String(valuePath)) as string) : "";

  return (
    <UIRadio
      label={String(label || "")}
      description={description ? String(description) : undefined}
      value={String(value || "")}
      name={String(name || "")}
      checked={currentValue === value}
      disabled={Boolean(disabled) || undefined}
      onChange={() => undefined}
    />
  );
};

export const Switch: FunctionComponent<ExtendedRenderProps> = ({
  element,
  getValue,
}) => {
  const { label, description, valuePath, defaultChecked, disabled } =
    element.props as Record<string, unknown>;
  const checked =
    getValue && valuePath
      ? (getValue(String(valuePath)) as boolean)
      : Boolean(defaultChecked);

  return (
    <UISwitch
      label={String(label || "")}
      description={description ? String(description) : undefined}
      checked={checked || undefined}
      disabled={Boolean(disabled) || undefined}
      onChange={() => undefined}
    />
  );
};

export const DateField: FunctionComponent<ExtendedRenderProps> = ({
  element,
  getValue,
}) => {
  const {
    label,
    description,
    error,
    valuePath,
    size = "medium",
    disabled,
  } = element.props as Record<string, unknown>;
  const value =
    getValue && valuePath ? (getValue(String(valuePath)) as string) : "";

  return (
    <UIDateField
      label={String(label || "")}
      description={description ? String(description) : undefined}
      error={error ? String(error) : undefined}
      value={value || ""}
      size={size as "small" | "medium" | "large"}
      disabled={Boolean(disabled) || undefined}
      onChange={() => undefined}
    />
  );
};

// =========================================================================
// Button Components
// =========================================================================
export const Button: FunctionComponent<ExtendedRenderProps> = ({
  element,
  onAction,
}) => {
  const {
    label,
    action,
    actionParams,
    type = "primary",
    size = "medium",
    disabled,
    pending,
    href,
  } = element.props as Record<string, unknown>;

  return (
    <UIButton
      type={type as "primary" | "secondary" | "destructive"}
      size={size as "small" | "medium" | "large"}
      disabled={Boolean(disabled) || undefined}
      pending={Boolean(pending) || undefined}
      href={href ? String(href) : undefined}
      onPress={
        action && onAction
          ? () =>
              onAction({
                name: String(action),
                params: actionParams as Record<string, unknown>,
              })
          : undefined
      }
    >
      {String(label || "")}
    </UIButton>
  );
};

export const ButtonGroup: FunctionComponent<ExtendedRenderProps> = ({
  children,
}) => {
  return <UIButtonGroup>{children}</UIButtonGroup>;
};

export const Link: FunctionComponent<ExtendedRenderProps> = ({ element }) => {
  const {
    label,
    href,
    type = "primary",
    external,
  } = element.props as Record<string, unknown>;
  return (
    <UILink
      href={String(href || "")}
      type={type as "primary" | "secondary"}
      external={Boolean(external) || undefined}
    >
      {String(label || "")}
    </UILink>
  );
};

// =========================================================================
// Chart Components
// =========================================================================
export const BarChart: FunctionComponent<ExtendedRenderProps> = ({
  element,
  data,
}) => {
  const {
    dataPath,
    xKey,
    yKey,
    colorKey,
    showAxis = "both",
    showGrid = "none",
    showLegend,
    showTooltip = true,
  } = element.props as Record<string, unknown>;

  // Get data from path
  const chartData =
    dataPath && data
      ? (getNestedValue(data, String(dataPath)) as Record<string, unknown>[])
      : [];

  if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
    return (
      <Box css={{ color: "secondary", font: "caption" }}>No data available</Box>
    );
  }

  return (
    <UIBarChart
      data={chartData}
      x={String(xKey || "x")}
      y={String(yKey || "y")}
      color={colorKey ? String(colorKey) : undefined}
      axis={showAxis as "x" | "y" | "both" | "none"}
      grid={showGrid as "x" | "y" | "both" | "none"}
      legend={Boolean(showLegend) || undefined}
      tooltip={Boolean(showTooltip)}
    />
  );
};

export const LineChart: FunctionComponent<ExtendedRenderProps> = ({
  element,
  data,
}) => {
  const {
    dataPath,
    xKey,
    yKey,
    colorKey,
    showAxis = "both",
    showGrid = "none",
    showLegend,
    showTooltip = true,
  } = element.props as Record<string, unknown>;

  const chartData =
    dataPath && data
      ? (getNestedValue(data, String(dataPath)) as Record<string, unknown>[])
      : [];

  if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
    return (
      <Box css={{ color: "secondary", font: "caption" }}>No data available</Box>
    );
  }

  return (
    <UILineChart
      data={chartData}
      x={String(xKey || "x")}
      y={String(yKey || "y")}
      color={colorKey ? String(colorKey) : undefined}
      axis={showAxis as "x" | "y" | "both" | "none"}
      grid={showGrid as "x" | "y" | "both" | "none"}
      legend={Boolean(showLegend) || undefined}
      tooltip={Boolean(showTooltip)}
    />
  );
};

export const Sparkline: FunctionComponent<ExtendedRenderProps> = ({
  element,
  data,
}) => {
  const { dataPath, xKey, yKey, showTooltip } = element.props as Record<
    string,
    unknown
  >;

  const chartData =
    dataPath && data
      ? (getNestedValue(data, String(dataPath)) as Record<string, unknown>[])
      : [];

  if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
    return <Box css={{ color: "secondary", font: "caption" }}>—</Box>;
  }

  return (
    <UISparkline
      data={chartData}
      x={String(xKey || "x")}
      y={String(yKey || "y")}
      tooltip={Boolean(showTooltip) || undefined}
    />
  );
};

// =========================================================================
// Table Component
// =========================================================================
export const DataTable: FunctionComponent<ExtendedRenderProps> = ({
  element,
  data,
}) => {
  const {
    title,
    dataPath,
    columns = [],
    emptyMessage,
  } = element.props as Record<string, unknown>;

  const tableData =
    dataPath && data
      ? (getNestedValue(data, String(dataPath)) as Record<string, unknown>[])
      : [];
  const cols = columns as Array<{ key: string; label: string }>;

  if (!tableData || tableData.length === 0) {
    return (
      <Box css={{ stack: "y", gap: "small" }}>
        {title && (
          <Box css={{ font: "subtitle", fontWeight: "semibold" }}>
            {String(title)}
          </Box>
        )}
        <Box css={{ color: "secondary", font: "caption" }}>
          {String(emptyMessage || "No data")}
        </Box>
      </Box>
    );
  }

  return (
    <Box css={{ stack: "y", gap: "small" }}>
      {title && (
        <Box css={{ font: "subtitle", fontWeight: "semibold" }}>
          {String(title)}
        </Box>
      )}
      <Table>
        <TableHead>
          <TableRow>
            {cols.map((col: { key: string; label: string }) => (
              <TableHeaderCell key={col.key}>{col.label}</TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {tableData.map((row, idx) => (
            <TableRow key={idx}>
              {cols.map((col: { key: string; label: string }) => (
                <TableCell key={col.key}>
                  {String(row[col.key] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

// =========================================================================
// Stripe-Specific Card Components
// =========================================================================
export const CustomerCard: FunctionComponent<ExtendedRenderProps> = ({
  element,
  onAction,
}) => {
  const {
    name,
    email,
    status = "active",
    customerId,
  } = element.props as Record<string, unknown>;

  return (
    <Box
      css={{
        stack: "y",
        gap: "small",
        padding: "medium",
        borderRadius: "medium",
        keyline: "neutral",
      }}
    >
      <Box css={{ stack: "x", distribute: "space-between", alignY: "center" }}>
        <Box css={{ font: "subtitle", fontWeight: "semibold" }}>
          {String(name || "")}
        </Box>
        <UIBadge type={status === "active" ? "positive" : "neutral"}>
          {String(status)}
        </UIBadge>
      </Box>
      <Box css={{ color: "secondary" }}>{String(email || "")}</Box>
      {customerId && onAction && (
        <UIButton
          type="secondary"
          size="small"
          onPress={() =>
            onAction({
              name: "viewCustomer",
              params: { customerId: String(customerId) },
            })
          }
        >
          View Details
        </UIButton>
      )}
    </Box>
  );
};

export const PaymentCard: FunctionComponent<ExtendedRenderProps> = ({
  element,
  onAction,
}) => {
  const {
    amount,
    currency = "usd",
    status = "succeeded",
    description,
    paymentId,
  } = element.props as Record<string, unknown>;

  const statusColors: Record<
    string,
    "positive" | "warning" | "negative" | "neutral" | "info"
  > = {
    succeeded: "positive",
    pending: "warning",
    failed: "negative",
    canceled: "neutral",
    requires_action: "info",
  };

  return (
    <Box
      css={{
        stack: "y",
        gap: "small",
        padding: "medium",
        borderRadius: "medium",
        keyline: "neutral",
      }}
    >
      <Box css={{ stack: "x", distribute: "space-between", alignY: "center" }}>
        <Box css={{ font: "title", fontWeight: "bold" }}>
          {formatCurrency(Number(amount) || 0, String(currency))}
        </Box>
        <UIBadge type={statusColors[String(status)] || "neutral"}>
          {String(status)}
        </UIBadge>
      </Box>
      {description && (
        <Box css={{ color: "secondary" }}>{String(description)}</Box>
      )}
      {paymentId && onAction && (
        <Box css={{ stack: "x", gap: "small" }}>
          <UIButton
            type="secondary"
            size="small"
            onPress={() =>
              onAction({
                name: "viewPayment",
                params: { paymentId: String(paymentId) },
              })
            }
          >
            View
          </UIButton>
          <UIButton
            type="destructive"
            size="small"
            onPress={() =>
              onAction({
                name: "refundPayment",
                params: { paymentId: String(paymentId) },
              })
            }
          >
            Refund
          </UIButton>
        </Box>
      )}
    </Box>
  );
};

export const SubscriptionCard: FunctionComponent<ExtendedRenderProps> = ({
  element,
}) => {
  const {
    planName,
    status = "active",
    amount,
    currency = "usd",
    interval = "month",
    currentPeriodEnd,
  } = element.props as Record<string, unknown>;

  const statusColors: Record<
    string,
    "positive" | "warning" | "negative" | "neutral" | "info"
  > = {
    active: "positive",
    trialing: "info",
    past_due: "warning",
    canceled: "neutral",
    unpaid: "negative",
    incomplete: "warning",
  };

  return (
    <Box
      css={{
        stack: "y",
        gap: "small",
        padding: "medium",
        borderRadius: "medium",
        keyline: "neutral",
      }}
    >
      <Box css={{ stack: "x", distribute: "space-between", alignY: "center" }}>
        <Box css={{ font: "subtitle", fontWeight: "semibold" }}>
          {String(planName || "")}
        </Box>
        <UIBadge type={statusColors[String(status)] || "neutral"}>
          {String(status)}
        </UIBadge>
      </Box>
      <Box css={{ font: "title", fontWeight: "bold" }}>
        {formatCurrency(Number(amount) || 0, String(currency))}/
        {String(interval)}
      </Box>
      {currentPeriodEnd && (
        <Box css={{ color: "secondary", font: "caption" }}>
          Renews: {String(currentPeriodEnd)}
        </Box>
      )}
    </Box>
  );
};

export const InvoiceCard: FunctionComponent<ExtendedRenderProps> = ({
  element,
  onAction,
}) => {
  const {
    invoiceNumber,
    amount,
    currency = "usd",
    status = "open",
    dueDate,
    customerEmail,
  } = element.props as Record<string, unknown>;

  const statusColors: Record<
    string,
    "positive" | "warning" | "negative" | "neutral" | "info"
  > = {
    draft: "neutral",
    open: "info",
    paid: "positive",
    void: "neutral",
    uncollectible: "negative",
  };

  return (
    <Box
      css={{
        stack: "y",
        gap: "small",
        padding: "medium",
        borderRadius: "medium",
        keyline: "neutral",
      }}
    >
      <Box css={{ stack: "x", distribute: "space-between", alignY: "center" }}>
        <Box css={{ font: "subtitle", fontWeight: "semibold" }}>
          {String(invoiceNumber || "")}
        </Box>
        <UIBadge type={statusColors[String(status)] || "neutral"}>
          {String(status)}
        </UIBadge>
      </Box>
      <Box css={{ font: "title", fontWeight: "bold" }}>
        {formatCurrency(Number(amount) || 0, String(currency))}
      </Box>
      {customerEmail && (
        <Box css={{ color: "secondary" }}>{String(customerEmail)}</Box>
      )}
      {dueDate && (
        <Box css={{ color: "secondary", font: "caption" }}>
          Due: {String(dueDate)}
        </Box>
      )}
      {status === "open" && onAction && (
        <UIButton
          type="primary"
          size="small"
          onPress={() =>
            onAction({
              name: "sendInvoice",
              params: { invoiceId: String(invoiceNumber) },
            })
          }
        >
          Send Invoice
        </UIButton>
      )}
    </Box>
  );
};

export const RefundCard: FunctionComponent<ExtendedRenderProps> = ({
  element,
}) => {
  const {
    amount,
    currency = "usd",
    status = "succeeded",
    reason,
  } = element.props as Record<string, unknown>;

  const statusColors: Record<
    string,
    "positive" | "warning" | "negative" | "neutral"
  > = {
    pending: "warning",
    succeeded: "positive",
    failed: "negative",
    canceled: "neutral",
  };

  return (
    <Box
      css={{
        stack: "y",
        gap: "small",
        padding: "medium",
        borderRadius: "medium",
        keyline: "neutral",
      }}
    >
      <Box css={{ stack: "x", distribute: "space-between", alignY: "center" }}>
        <Box css={{ font: "title", fontWeight: "bold" }}>
          {formatCurrency(Number(amount) || 0, String(currency))}
        </Box>
        <UIBadge type={statusColors[String(status)] || "neutral"}>
          {String(status)}
        </UIBadge>
      </Box>
      {reason && <Box css={{ color: "secondary" }}>{String(reason)}</Box>}
    </Box>
  );
};

export const DisputeCard: FunctionComponent<ExtendedRenderProps> = ({
  element,
}) => {
  const {
    amount,
    currency = "usd",
    status = "needs_response",
    reason,
    dueDate,
  } = element.props as Record<string, unknown>;

  const statusColors: Record<
    string,
    "positive" | "warning" | "negative" | "neutral" | "urgent" | "info"
  > = {
    warning_needs_response: "urgent",
    warning_under_review: "warning",
    warning_closed: "neutral",
    needs_response: "urgent",
    under_review: "warning",
    won: "positive",
    lost: "negative",
  };

  return (
    <Box
      css={{
        stack: "y",
        gap: "small",
        padding: "medium",
        borderRadius: "medium",
        keyline: "critical",
      }}
    >
      <Box css={{ stack: "x", distribute: "space-between", alignY: "center" }}>
        <Box css={{ font: "title", fontWeight: "bold" }}>
          {formatCurrency(Number(amount) || 0, String(currency))}
        </Box>
        <UIBadge type={statusColors[String(status)] || "warning"}>
          {String(status).replace(/_/g, " ")}
        </UIBadge>
      </Box>
      {reason && <Box css={{ color: "secondary" }}>{String(reason)}</Box>}
      {dueDate && (
        <Box css={{ color: "critical", font: "caption" }}>
          Response due: {String(dueDate)}
        </Box>
      )}
    </Box>
  );
};

export const BalanceCard: FunctionComponent<ExtendedRenderProps> = ({
  element,
}) => {
  const {
    available,
    pending,
    currency = "usd",
  } = element.props as Record<string, unknown>;

  return (
    <Box
      css={{
        stack: "y",
        gap: "small",
        padding: "medium",
        borderRadius: "medium",
        keyline: "neutral",
      }}
    >
      <Box css={{ font: "subtitle", fontWeight: "semibold" }}>Balance</Box>
      <Box css={{ stack: "x", distribute: "space-between" }}>
        <Box>
          <Box css={{ font: "caption", color: "secondary" }}>Available</Box>
          <Box css={{ font: "title", fontWeight: "bold", color: "success" }}>
            {formatCurrency(Number(available) || 0, String(currency))}
          </Box>
        </Box>
        <Box>
          <Box css={{ font: "caption", color: "secondary" }}>Pending</Box>
          <Box css={{ font: "title", fontWeight: "bold" }}>
            {formatCurrency(Number(pending) || 0, String(currency))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// =========================================================================
// Chip Components
// =========================================================================
export const Chip: FunctionComponent<ExtendedRenderProps> = ({
  element,
  onAction,
}) => {
  const { label, value, removable, action } = element.props as Record<
    string,
    unknown
  >;
  return (
    <UIChip
      label={String(label || "")}
      value={value ? String(value) : undefined}
      onClose={
        removable && action && onAction
          ? () => onAction({ name: String(action) })
          : undefined
      }
    />
  );
};

export const ChipList: FunctionComponent<ExtendedRenderProps> = ({
  children,
}) => {
  return <UIChipList>{children}</UIChipList>;
};

// =========================================================================
// Tooltip Component
// =========================================================================
export const Tooltip: FunctionComponent<ExtendedRenderProps> = ({
  element,
  children,
}) => {
  const { content, placement = "top" } = element.props as Record<
    string,
    unknown
  >;

  // Tooltip needs a trigger element - use children if available
  if (!children) {
    return <Box>{String(content || "")}</Box>;
  }

  return (
    <UITooltip
      trigger={<Box>{children}</Box>}
      placement={placement as "top" | "bottom" | "left" | "right"}
    >
      <Box>{String(content || "")}</Box>
    </UITooltip>
  );
};

// =========================================================================
// Fallback Component
// =========================================================================
export const Fallback: FunctionComponent<ExtendedRenderProps> = ({
  element,
}) => {
  return (
    <Box css={{ padding: "small", keyline: "critical", borderRadius: "small" }}>
      <Box css={{ color: "critical", font: "caption" }}>
        Unknown component: {element.type}
      </Box>
    </Box>
  );
};

// =========================================================================
// Utility Functions
// =========================================================================
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/^\//, "").split("/");
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

// =========================================================================
// Component Map Export
// =========================================================================
export const components: Record<
  string,
  FunctionComponent<ExtendedRenderProps>
> = {
  // Layout
  Stack,
  Inline,
  Divider,
  Accordion,
  AccordionItem,
  // Typography
  Heading,
  Text,
  // Data Display
  Metric,
  Badge,
  Icon,
  Img,
  Spinner,
  // Feedback
  Banner,
  // Lists
  List,
  ListItem,
  PropertyList,
  PropertyListItem,
  TaskList,
  TaskListItem,
  // Menus
  Menu,
  MenuItem,
  MenuGroup,
  // Forms
  TextField,
  TextArea,
  Select,
  Checkbox,
  Radio,
  Switch,
  DateField,
  // Buttons
  Button,
  ButtonGroup,
  Link,
  // Charts
  BarChart,
  LineChart,
  Sparkline,
  // Tables
  DataTable,
  // Stripe Cards
  CustomerCard,
  PaymentCard,
  SubscriptionCard,
  InvoiceCard,
  RefundCard,
  DisputeCard,
  BalanceCard,
  // Chips
  Chip,
  ChipList,
  // Tooltip
  Tooltip,
  // Fallback
  Fallback,
};

import type { LucideIcon } from "lucide-react-native";

import { useHeaderInset } from "@/hooks/use-header-inset";

import { Box } from "./box";
import { Button } from "./button";
import { Icon } from "./icon";
import { Text } from "./text";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onPress: () => void; loading?: boolean };
};

/** iOS "content unavailable" view: icon, title, description and optional action. */
export function EmptyState({ icon, title, description, action }: Props) {
  const headerInset = useHeaderInset();

  return (
    <Box flex={1} center px="xxxl" gap="sm" style={{ paddingTop: headerInset }}>
      <Icon icon={icon} size={56} color="systemGray2" />
      <Text
        variant="title2"
        weight="bold"
        align="center"
        style={{ marginTop: 8 }}
      >
        {title}
      </Text>
      <Text variant="subheadline" color="secondaryLabel" align="center">
        {description}
      </Text>
      {action && (
        <Box style={{ marginTop: 16 }}>
          <Button
            title={action.label}
            loading={action.loading}
            onPress={action.onPress}
          />
        </Box>
      )}
    </Box>
  );
}

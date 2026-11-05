import { Stack, useRouter } from "expo-router";
import { useState } from "react";

import {
  HeaderButton,
  ListSection,
  ScrollView,
  Screen,
  TextField,
  showAlert,
} from "@/components/ui";
import { createPack } from "@/db/mutations";
import { useHeaderInset } from "@/hooks/use-header-inset";

export default function NewPack() {
  const router = useRouter();
  const headerInset = useHeaderInset();
  const [name, setName] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");

  const canSave = name.trim().length > 0;

  const save = () => {
    try {
      createPack({ name, author, description });
      router.back();
    } catch (error) {
      showAlert(
        "Couldn’t Create Pack",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    }
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "New Pack",
          headerLeft: () => <HeaderButton label="Cancel" onPress={router.back} />,
          headerRight: () => (
            <HeaderButton label="Create" bold disabled={!canSave} onPress={save} />
          ),
        }}
      />
      <ScrollView gap="xl" py="lg" contentContainerStyle={{ paddingTop: headerInset + 16 }}>
        <ListSection>
          <TextField
            autoFocus
            value={name}
            onChangeText={setName}
            placeholder="Name"
            returnKeyType="done"
            onSubmitEditing={() => canSave && save()}
          />
        </ListSection>
        <ListSection footer="Shown to people you share this pack with.">
          <TextField value={author} onChangeText={setAuthor} placeholder="Author" />
          <TextField
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
          />
        </ListSection>
      </ScrollView>
    </Screen>
  );
}

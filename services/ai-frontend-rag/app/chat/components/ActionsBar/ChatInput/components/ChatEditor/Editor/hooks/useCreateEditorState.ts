import { Document } from "@tiptap/extension-document";
import { HardBreak } from "@tiptap/extension-hard-break";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Text } from "@tiptap/extension-text";
import { Extension, useEditor } from "@tiptap/react";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useCreateEditorState = (placeholder?: string) => {
  const PreventEnter = Extension.create({
    addKeyboardShortcuts: () => {
      return {
        Enter: () => true,
        Escape: () => true,
      };
    },
  });

  const editor = useEditor({
    autofocus: true,
    onFocus: () => {
      editor?.commands.focus("end");
    },
    parseOptions: {
      preserveWhitespace: "full",
    },
    extensions: [
      PreventEnter,
      Placeholder.configure({
        showOnlyWhenEditable: true,
        placeholder: "Ask a question",
      }),
      Document,
      Text,
      Paragraph,
      HardBreak,
    ],
  });

  return {
    editor,
  };
};

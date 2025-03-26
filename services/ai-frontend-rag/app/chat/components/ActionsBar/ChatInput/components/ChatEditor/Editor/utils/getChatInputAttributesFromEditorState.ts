import { Editor } from "@tiptap/core";

type ChatInputAttributes = {
  text: string;
};

export const getChatInputAttributesFromEditorState = (
  editor: Editor | null
): ChatInputAttributes => {
  if (editor === null) {
    return {
      text: "",
    };
  }

  const editorJsonContent = editor.getJSON();

  if (
    editorJsonContent.content === undefined ||
    editorJsonContent.content.length === 0
  ) {
    return {
      text: "",
    };
  }

  let text = "";

  editorJsonContent.content.forEach((block) => {
    if (block.content === undefined || block.content.length === 0) {
      return;
    }

    block.content.forEach((innerBlock) => {
      if (innerBlock.type === "text") {
        text += innerBlock.text;
      }
    });
  });

  return {
    text,
  };
};

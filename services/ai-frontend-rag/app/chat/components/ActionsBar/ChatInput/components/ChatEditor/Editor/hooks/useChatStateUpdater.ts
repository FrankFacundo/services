import { Editor, EditorEvents } from "@tiptap/core";
import { useCallback, useEffect } from "react";

import { getChatInputAttributesFromEditorState } from "../utils/getChatInputAttributesFromEditorState";

type UseChatStateUpdaterProps = {
  editor: Editor | null;
  setMessage: (message: string) => void;
};
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useChatStateUpdater = ({
  editor,
  setMessage,
}: UseChatStateUpdaterProps) => {
  const onEditorUpdate = useCallback(
    ({ editor: editorNewState }: EditorEvents["update"]) => {
      const { text } = getChatInputAttributesFromEditorState(editorNewState);

      setMessage(text);
    },
    [setMessage]
  );

  useEffect(() => {
    editor?.on("update", onEditorUpdate);

    return () => {
      editor?.off("update", onEditorUpdate);
    };
  }, [editor, onEditorUpdate, setMessage]);
};

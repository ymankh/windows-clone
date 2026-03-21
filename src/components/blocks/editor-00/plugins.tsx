import { useEffect } from "react"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import {
  CLEAR_EDITOR_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical"

import { NotesEditorActions, type NotesEditorCommandDetail } from "@/apps/notes/constants"
import { ContentEditable } from "@/components/editor/editor-ui/content-editable"

const WindowCommandPlugin = () => {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<NotesEditorCommandDetail>).detail
      if (!detail) return
      const action = detail.action

      switch (action) {
        case NotesEditorActions.bold:
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")
          break
        case NotesEditorActions.italic:
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")
          break
        case NotesEditorActions.underline:
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")
          break
        case NotesEditorActions.undo:
          editor.dispatchCommand(UNDO_COMMAND, undefined)
          break
        case NotesEditorActions.redo:
          editor.dispatchCommand(REDO_COMMAND, undefined)
          break
        case NotesEditorActions.clear:
          editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)
          break
        default:
          break
      }
    }

    window.addEventListener("notes-editor-command", handler as EventListener)
    return () =>
      window.removeEventListener("notes-editor-command", handler as EventListener)
  }, [editor])

  return null
}

export function Plugins() {
  return (
    <div className="relative">
      {/* toolbar plugins */}
      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <div className="">
              <div className="">
                <ContentEditable placeholder={"Start typing ..."} />
              </div>
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <WindowCommandPlugin />
        {/* editor plugins */}
      </div>
      {/* actions plugins */}
    </div>
  )
}

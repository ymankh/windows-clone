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

import { ContentEditable } from "@/components/editor/editor-ui/content-editable"

const WindowCommandPlugin = () => {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ action: string }>).detail
      if (!detail) return
      const action = detail.action

      switch (action) {
        case "bold":
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")
          break
        case "italic":
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")
          break
        case "underline":
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")
          break
        case "undo":
          editor.dispatchCommand(UNDO_COMMAND, undefined)
          break
        case "redo":
          editor.dispatchCommand(REDO_COMMAND, undefined)
          break
        case "clear":
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

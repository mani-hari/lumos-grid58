import { useMemo } from 'react'
import { marked } from 'marked'

// Configure marked for safe rendering
marked.setOptions({
  gfm: true,
  breaks: true,
})

export default function MarkdownPreview({ content }) {
  const html = useMemo(() => {
    if (!content) return '<p class="text-gray-400 italic">No content yet...</p>'
    try {
      return marked.parse(content)
    } catch {
      return `<pre>${content}</pre>`
    }
  }, [content])

  return (
    <div
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

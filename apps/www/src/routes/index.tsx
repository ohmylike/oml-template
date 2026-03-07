import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div>
      <h1>oml-__SERVICE_NAME__</h1>
      <p>Welcome to oml-__SERVICE_NAME__.</p>
    </div>
  )
}

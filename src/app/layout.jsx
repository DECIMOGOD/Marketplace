import './globals.css' // if you have global styles

export const metadata = {
  title: 'Marketplace App',
  description: 'Your marketplace application',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
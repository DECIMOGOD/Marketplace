import './globals.css' // if you have global styles

export const metadata = {
  title: 'Marketplace App',
  description: 'Your marketplace application',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
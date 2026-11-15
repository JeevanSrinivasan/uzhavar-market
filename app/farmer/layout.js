import FarmerBottomNav from '../../components/FarmerBottomNav'

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function FarmerLayout({ children }) {
  return (
    <div className="pb-16 sm:pb-0 min-h-screen">
      {children}
      <FarmerBottomNav />
    </div>
  )
}

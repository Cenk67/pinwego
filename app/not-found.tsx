import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-heading text-4xl">Sayfa bulunamadı</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Bu adres Pinora’da yok. Aramadan devam edebilirsin.
      </p>
      <Button className="mt-6 h-11 rounded-full px-5" nativeButton={false} render={<Link href="/" />}>
        Ana sayfa
      </Button>
    </div>
  )
}

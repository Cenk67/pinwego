import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-4xl">Bu sayfa dizinde yok</h1>
      <p className="mt-3 text-muted-foreground">
        İşletme taşınmış veya bağlantı hatalı olabilir.
      </p>
      <Link href="/" className={cn(buttonVariants(), "mt-6 inline-flex")}>
        Ana sayfaya dön
      </Link>
    </div>
  )
}

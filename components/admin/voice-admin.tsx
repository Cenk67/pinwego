"use client"

import { useSyncExternalStore } from "react"
import { fieldClass } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { translate } from "@/lib/i18n"
import { getServerVoiceStats, getVoiceStats, subscribeVoiceStats } from "@/lib/voice/analytics"
import { SPEECH_LANGUAGES, speechLanguageLabel } from "@/lib/voice/languages"
import {
  getServerVoiceSettings,
  getVoiceSettings,
  resetVoiceSettings,
  subscribeVoice,
  updateVoiceSettings,
  type SpeechProvider,
  type VoiceCopyKey,
  type VoiceSettings,
} from "@/lib/voice/settings"

const providers: { id: SpeechProvider; label: string }[] = [
  { id: "browser", label: "Tarayıcı (önerilen)" },
  { id: "openai", label: "OpenAI — bağlı değil" },
  { id: "google", label: "Google Cloud — bağlı değil" },
  { id: "azure", label: "Azure — bağlı değil" },
  { id: "whisper", label: "Whisper — bağlı değil" },
]

const copyFields: { key: VoiceCopyKey; label: string }[] = [
  { key: "unsupported", label: "Tarayıcı desteklemiyor" },
  { key: "denied", label: "Mikrofon izni kapalı" },
  { key: "noMic", label: "Mikrofon yok" },
  { key: "nothing", label: "Ses anlaşılmadı" },
  { key: "unclear", label: "Konuşma net değil" },
  { key: "network", label: "Bağlantı koptu" },
  { key: "api", label: "Ses hizmeti yanıt vermiyor" },
  { key: "provider", label: "Sağlayıcı bağlı değil" },
  { key: "locationNeed", label: "Konum izni gerekir" },
]

export function VoiceAdmin() {
  const settings = useSyncExternalStore(subscribeVoice, getVoiceSettings, getServerVoiceSettings)
  const stats = useSyncExternalStore(subscribeVoiceStats, getVoiceStats, getServerVoiceStats)

  function patch(next: Partial<VoiceSettings>) {
    updateVoiceSettings(next)
  }

  return (
    <div className="mt-8 grid gap-4">
      <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-2xl">Sesli Arama Ayarları</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Mikrofon, arama kutusunun içindedir. Konuşma metne çevrilir ve mevcut arama motoruna gider. Ses kaydı
          saklanmaz, analitik de metni tutmaz.
        </p>
        <div className="mt-5 grid gap-3">
          <Label className="gap-2">
            <Checkbox checked={settings.enabled} onCheckedChange={(checked) => patch({ enabled: checked === true })} />
            Sesli arama açık
          </Label>
          <Label className="gap-2">
            <Checkbox checked={settings.parser} onCheckedChange={(checked) => patch({ parser: checked === true })} />
            Cümleyi şehir, kategori ve filtreye ayır
          </Label>
          <Label className="gap-2">
            <Checkbox checked={settings.analytics} onCheckedChange={(checked) => patch({ analytics: checked === true })} />
            Anonim sayaçlar açık
          </Label>
        </div>
      </section>
      <section className="grid gap-4 rounded-3xl bg-card p-5 ring-1 ring-foreground/10 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm">
          Varsayılan dil
          <select
            className={fieldClass}
            value={settings.defaultLanguage}
            onChange={(event) => patch({ defaultLanguage: event.target.value })}
          >
            <option value="auto">Sitenin dili</option>
            {SPEECH_LANGUAGES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm">
          Konuşma sağlayıcısı
          <select
            className={fieldClass}
            value={settings.provider}
            onChange={(event) => patch({ provider: event.target.value as SpeechProvider })}
          >
            {providers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm">
          En uzun konuşma (saniye)
          <Input
            type="number"
            min={5}
            max={60}
            value={settings.maxSeconds}
            onChange={(event) => patch({ maxSeconds: Number(event.target.value) })}
          />
        </label>
        <div className="grid gap-1.5 text-sm">
          Mikrofon görünümü
          <div className="flex gap-2">
            {([
              ["outline", "Çerçeveli"],
              ["solid", "Dolu"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => patch({ appearance: id })}
                className={
                  settings.appearance === id
                    ? "h-11 rounded-full bg-primary px-4 text-sm text-primary-foreground"
                    : "h-11 rounded-full bg-secondary px-4 text-sm"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-2xl">Desteklenen diller</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {SPEECH_LANGUAGES.map((item) => {
            const on = settings.languages.includes(item.id)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  const languages = on
                    ? settings.languages.filter((lang) => lang !== item.id)
                    : [...settings.languages, item.id]
                  patch({ languages })
                }}
                className={on ? "h-11 rounded-full bg-primary px-3 text-sm text-primary-foreground" : "h-11 rounded-full bg-secondary px-3 text-sm"}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </section>
      <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-2xl">Ziyaretçiye görünen uyarılar</h2>
        <p className="mt-2 text-sm text-muted-foreground">Boş bırakılırsa sitenin dilindeki hazır metin kullanılır.</p>
        <div className="mt-4 grid gap-3">
          {copyFields.map((field) => (
            <label key={field.key} className="grid gap-1.5 text-sm">
              {field.label}
              <Input
                value={settings.copy[field.key]}
                placeholder={translate("tr", `voice.${field.key}`)}
                onChange={(event) => patch({ copy: { ...settings.copy, [field.key]: event.target.value } })}
              />
            </label>
          ))}
        </div>
      </section>
      <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-2xl">Sayaç</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Bu tarayıcıda: {stats.started} başladı, {stats.completed} tamamlandı, {stats.failed} olmadı, {stats.denied}{" "}
          izin kapalı. Son dil: {speechLanguageLabel(stats.events[0]?.language ?? "") || "—"}.
        </p>
        <Button type="button" variant="outline" className="mt-4 h-11 rounded-xl" onClick={() => resetVoiceSettings()}>
          Ayarları sıfırla
        </Button>
      </section>
    </div>
  )
}

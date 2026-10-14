import { localeIds, type LocaleId } from "@/lib/i18n-ids"
import { salesAddress, supportAddress } from "@/lib/mail-policy"

type Kind = "verify" | "reset" | "changed"

const subjects: Record<Kind, string[]> = {
  verify: [
    "Pinwego e-posta doğrulaması",
    "Confirm your Pinwego email",
    "Pinwego E-Mail bestätigen",
    "Confirme ton e-mail Pinwego",
    "Confirma tu correo de Pinwego",
    "Confirma o e-mail do Pinwego",
    "أكّد بريد Pinwego",
    "Подтвердите почту Pinwego",
    "确认 Pinwego 邮箱",
    "Pinwego のメールを確認",
    "Pinwego 이메일을 확인하세요",
    "Pinwego ईमेल की पुष्टि करें",
  ],
  reset: [
    "Pinwego şifre sıfırlama",
    "Reset your Pinwego password",
    "Pinwego Passwort zurücksetzen",
    "Réinitialise ton mot de passe Pinwego",
    "Restablece tu contraseña de Pinwego",
    "Repõe a palavra-passe do Pinwego",
    "إعادة تعيين كلمة مرور Pinwego",
    "Сброс пароля Pinwego",
    "重置 Pinwego 密码",
    "Pinwego のパスワード再設定",
    "Pinwego 비밀번호 재설정",
    "Pinwego पासवर्ड रीसेट",
  ],
  changed: [
    "Pinwego şifren değişti",
    "Your Pinwego password changed",
    "Dein Pinwego-Passwort wurde geändert",
    "Ton mot de passe Pinwego a changé",
    "Tu contraseña de Pinwego cambió",
    "A tua palavra-passe do Pinwego mudou",
    "تغيّرت كلمة مرور Pinwego",
    "Пароль Pinwego изменён",
    "Pinwego 密码已更改",
    "Pinwego のパスワードが変わりました",
    "Pinwego 비밀번호가 바뀌었습니다",
    "Pinwego पासवर्ड बदल गया",
  ],
}

const bodies: Record<Kind, string[]> = {
  verify: [
    "Hesabı açmak için bu bağlantıyı bir kez kullan. 24 saat sonra geçersiz olur.",
    "Use this link once to open the account. It expires in 24 hours.",
    "Nutze diesen Link einmal, um das Konto zu öffnen. Er verfällt nach 24 Stunden.",
    "Utilise ce lien une fois pour ouvrir le compte. Il expire dans 24 heures.",
    "Usa este enlace una vez para abrir la cuenta. Caduca a las 24 horas.",
    "Usa esta ligação uma vez para abrir a conta. Expira em 24 horas.",
    "استخدم هذا الرابط مرة واحدة لفتح الحساب. ينتهي خلال 24 ساعة.",
    "Откройте аккаунт по этой ссылке один раз. Она истекает через 24 часа.",
    "用此链接打开账户，只能用一次。24 小时后失效。",
    "このリンクは一度だけ使えます。24時間で無効になります。",
    "이 링크는 한 번만 사용할 수 있습니다. 24시간 후 만료됩니다.",
    "खाता खोलने के लिए यह लिंक एक बार इस्तेमाल करें। 24 घंटे बाद समाप्त।",
  ],
  reset: [
    "Yeni şifre belirlemek için bu bağlantıyı bir kez kullan. 1 saat sonra geçersiz olur.",
    "Use this link once to choose a new password. It expires in 1 hour.",
    "Nutze diesen Link einmal für ein neues Passwort. Er verfällt nach 1 Stunde.",
    "Utilise ce lien une fois pour un nouveau mot de passe. Il expire dans 1 heure.",
    "Usa este enlace una vez para una contraseña nueva. Caduca en 1 hora.",
    "Usa esta ligação uma vez para uma palavra-passe nova. Expira em 1 hora.",
    "استخدم هذا الرابط مرة واحدة لكلمة مرور جديدة. ينتهي خلال ساعة.",
    "Задайте новый пароль по этой ссылке один раз. Она истекает через 1 час.",
    "用此链接设置新密码，只能用一次。1 小时后失效。",
    "新しいパスワードはこのリンクで一度だけ。1時間で無効になります。",
    "새 비밀번호는 이 링크로 한 번만. 1시간 후 만료됩니다.",
    "नया पासवर्ड इस लिंक से एक बार चुनें। 1 घंटे बाद समाप्त।",
  ],
  changed: [
    "Şifren az önce değişti. Bunu sen yapmadıysan bize yaz.",
    "Your password just changed. If this was not you, write to us.",
    "Dein Passwort wurde gerade geändert. Wenn du das nicht warst, schreib uns.",
    "Ton mot de passe vient de changer. Si ce n’était pas toi, écris-nous.",
    "Tu contraseña acaba de cambiar. Si no fuiste tú, escríbenos.",
    "A tua palavra-passe acabou de mudar. Se não foste tu, escreve-nos.",
    "تغيّرت كلمة المرور الآن. إذا لم تكن أنت، راسلنا.",
    "Пароль только что изменён. Если это были не вы, напишите нам.",
    "密码刚刚更改。如果不是你本人，请写信给我们。",
    "パスワードが今変わりました。身に覚えがなければ連絡してください。",
    "비밀번호가 방금 바뀌었습니다. 본인이 아니라면 적어 주세요.",
    "पासवर्ड अभी बदला। आपने नहीं किया तो हमें लिखें।",
  ],
}

const buttons: Record<Exclude<Kind, "changed">, string[]> = {
  verify: ["E-postayı doğrula", "Confirm email", "E-Mail bestätigen", "Confirmer l’e-mail", "Confirmar correo", "Confirmar e-mail", "أكّد البريد", "Подтвердить почту", "确认邮箱", "メールを確認", "이메일 확인", "ईमेल की पुष्टि"],
  reset: ["Yeni şifre belirle", "Choose a new password", "Neues Passwort", "Nouveau mot de passe", "Nueva contraseña", "Nova palavra-passe", "كلمة مرور جديدة", "Новый пароль", "设置新密码", "新しいパスワード", "새 비밀번호", "नया पासवर्ड"],
}

const verifyNotes = [
  "Bu ileti {email} adresi içindir. Bağlantı açılmazsa hesap sayfasından yenisini iste. Bu kaydı sen istemediysen iletiyi yok say.",
  "This message is for {email}. If the link does not open, ask for a new one on the account page. If you did not ask for this, ignore it.",
  "Diese Nachricht ist für {email}. Öffnet sich der Link nicht, fordere auf der Kontoseite einen neuen an. Wenn du das nicht warst, ignoriere sie.",
  "Ce message est pour {email}. Si le lien ne s’ouvre pas, demande-en un nouveau sur la page du compte. Si tu n’as rien demandé, ignore-le.",
  "Este mensaje es para {email}. Si el enlace no abre, pide otro en la página de la cuenta. Si no lo pediste, ignóralo.",
  "Esta mensagem é para {email}. Se a ligação não abrir, pede outra na página da conta. Se não pediste, ignora-a.",
  "هذه الرسالة لـ {email}. إذا لم يفتح الرابط فاطلب جديداً من صفحة الحساب. إذا لم تطلب ذلك فتجاهل الرسالة.",
  "Это письмо для {email}. Если ссылка не открывается, запросите новую на странице аккаунта. Если вы этого не просили, проигнорируйте письмо.",
  "这封信是发给 {email} 的。链接打不开时，请在账户页再要一封。如果不是你本人申请，请忽略。",
  "このメールは {email} 宛です。リンクが開かないときはアカウントページから再送を求めてください。心当たりがなければ無視してください。",
  "이 메일은 {email} 주소용입니다. 링크가 열리지 않으면 계정 페이지에서 다시 요청하세요. 본인이 요청하지 않았다면 무시하세요.",
  "यह संदेश {email} के लिए है। लिंक न खुले तो खाता पृष्ठ से नया माँगें। आपने नहीं माँगा तो इसे छोड़ दें।",
]

function at(values: string[], locale: LocaleId) {
  const index = localeIds.indexOf(locale)
  return values[index] ?? values[0]
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] ?? char)
}

export function mailContent(input: { locale: LocaleId; kind: Kind; url?: string; business?: boolean; email?: string }) {
  const subject = at(subjects[input.kind], input.locale)
  const note = input.kind === "verify" ? at(verifyNotes, input.locale).replaceAll("{email}", input.email || "bu adres") : ""
  const body = [at(bodies[input.kind], input.locale), note].filter(Boolean).join(" ")
  const button = input.kind === "changed" ? "" : at(buttons[input.kind], input.locale)
  const sales = input.business ? ` ${salesAddress}` : ""
  const text = [subject, "", body, input.url ?? "", "", supportAddress + sales].filter(Boolean).join("\n")
  const action = input.url
    ? `<p style="margin:24px 0"><a href="${input.url}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:600">${button}</a></p><p style="word-break:break-all;color:#475569;font-size:13px">${escapeHtml(input.url)}</p>`
    : ""
  const html = `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:480px;background:#fff;border-radius:24px;padding:28px"><tr><td><p style="margin:0;font-weight:700;color:#1d4ed8">pinwego</p><h1 style="font-size:24px;line-height:1.3;margin:16px 0">${subject}</h1><p style="font-size:15px;line-height:1.6;margin:0">${escapeHtml(body)}</p>${action}<p style="margin:28px 0 0;font-size:12px;line-height:1.5;color:#64748b">${supportAddress}${sales ? `<br>${salesAddress}` : ""}</p></td></tr></table></td></tr></table></body></html>`
  return { subject, text, html }
}

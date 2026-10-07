"use client";

import React, { useState } from "react";
import { 
  X, 
  CalendarCheck, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  CheckCircle2, 
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { BusinessItem, ServiceItem, BookingFormData } from "@/types/directory";
import { formatPrice } from "@/lib/utils";

interface BookingModalProps {
  business: BusinessItem | null;
  service?: ServiceItem;
  isOpen: boolean;
  onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  business,
  service,
  isOpen,
  onClose,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    service ? service.id : (business?.services[0]?.id || '')
  );
  const [selectedDate, setSelectedDate] = useState<string>("2026-10-12");
  const [selectedTime, setSelectedTime] = useState<string>("14:00");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !business) return null;

  const currentService = business.services.find((s) => s.id === selectedServiceId) || business.services[0];

  const availableSlots = [
    "10:00", "11:30", "14:00", "15:30", "17:00", "18:30"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800 bg-gradient-to-r from-indigo-50/50 to-white dark:from-zinc-950 dark:to-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Anında Online Randevu (Booksy Standardı)
              </h3>
              <p className="text-[11px] text-zinc-500">
                {business.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h4 className="text-lg font-bold text-zinc-900 dark:text-white">
              Randevunuz Başarıyla Oluşturuldu!
            </h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 max-w-sm mx-auto">
              <strong>{currentService?.name}</strong> için <strong>{selectedDate} saat {selectedTime}</strong> randevunuz onaylandı. Onay SMS ve takvim davetiniz iletildi.
            </p>
            <div className="rounded-xl bg-zinc-50 p-4 text-xs text-zinc-500 dark:bg-zinc-800/50">
              İşletme İletişim: {business.phone} • {business.location.address}
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-zinc-900 py-3 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
            >
              Tamam
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            
            {/* Service Selection */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Hizmet Seçimi
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              >
                {business.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - {s.price === 0 ? "Ücretsiz" : formatPrice(s.price)}
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Time Slot selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tarih
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Saat Dilimi
                </label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer Contact */}
            <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Adınız & Soyadınız
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ahmet Yılmaz"
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Telefon (SMS Onayı İçin)
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0532 000 00 00"
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    E-Posta
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="ornek@mail.com"
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Özel Not / İstek
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Varsa özel talebinizi yazabilirsiniz..."
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>

            {/* Price Summary */}
            <div className="rounded-xl bg-zinc-50 p-3 text-xs flex items-center justify-between dark:bg-zinc-800">
              <span className="text-zinc-600 dark:text-zinc-400">Tahmini Tutar:</span>
              <span className="text-sm font-bold text-zinc-900 dark:text-white">
                {currentService ? (currentService.price === 0 ? "Ücretsiz Ön Görüşme" : formatPrice(currentService.price)) : "Belirlenecek"}
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-md transition hover:bg-indigo-700 active:scale-95"
            >
              Randevuyu Onayla ve Takvime Ekle
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

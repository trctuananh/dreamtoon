import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Shield, Lock, Eye, FileText } from 'lucide-react';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';

export function PrivacyPolicyView({ lang, onBack }: { lang: Language, onBack: () => void }) {
  const { t } = useTranslation(lang);

  const sections = [
    {
      icon: <Shield className="text-blue-500" />,
      title: lang === 'en' ? "Information We Collect" : "Thông tin chúng tôi thu thập",
      content: lang === 'en' 
        ? "We collect information you provide directly to us, such as when you create an account, upload content, or communicate with us. This includes your name, email address, and profile information."
        : "Chúng tôi thu thập thông tin bạn cung cấp trực tiếp cho chúng tôi, chẳng hạn như khi bạn tạo tài khoản, đăng nội dung hoặc liên hệ với chúng tôi. Thông tin này bao gồm tên, địa chỉ email và thông tin hồ sơ của bạn."
    },
    {
      icon: <Eye className="text-purple-500" />,
      title: lang === 'en' ? "How We Use Your Information" : "Cách chúng tôi sử dụng thông tin",
      content: lang === 'en'
        ? "We use the information we collect to provide, maintain, and improve our services, to communicate with you, and to protect our users and platform."
        : "Chúng tôi sử dụng thông tin thu thập được để cung cấp, duy trì và cải thiện dịch vụ, để liên lạc với bạn và để bảo vệ người dùng cũng như nền tảng của chúng tôi."
    },
    {
      icon: <Lock className="text-green-500" />,
      title: lang === 'en' ? "Data Security" : "Bảo mật dữ liệu",
      content: lang === 'en'
        ? "We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction."
        : "Chúng tôi thực hiện các biện pháp hợp lý để giúp bảo vệ thông tin về bạn khỏi bị mất mát, trộm cắp, lạm dụng và truy cập, tiết lộ, thay đổi và hủy hoại trái phép."
    },
    {
      icon: <FileText className="text-orange-500" />,
      title: lang === 'en' ? "Your Choices" : "Lựa chọn của bạn",
      content: lang === 'en'
        ? "You may update or correct your profile information at any time by logging into your account. You can also delete your account if you no longer wish to use our services."
        : "Bạn có thể cập nhật hoặc sửa đổi thông tin hồ sơ của mình bất kỳ lúc nào bằng cách đăng nhập vào tài khoản. Bạn cũng có thể xóa tài khoản nếu không còn muốn sử dụng dịch vụ của chúng tôi."
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 pt-24 pb-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors mb-8 group"
        >
          <div className="p-2 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-all">
            <ArrowLeft size={20} />
          </div>
          <span className="font-bold uppercase tracking-widest text-xs">{t('backToDetails' as any)}</span>
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-xl border border-zinc-100"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Shield size={32} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight">
                {t('privacyPolicy' as any)}
              </h1>
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">
                {lang === 'en' ? "Last updated: April 8, 2026" : "Cập nhật lần cuối: 8 tháng 4, 2026"}
              </p>
            </div>
          </div>

          <div className="prose prose-zinc max-w-none">
            <p className="text-zinc-600 leading-relaxed mb-12">
              {lang === 'en' 
                ? "At Dreamtoon, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our platform."
                : "Tại Dreamtoon, chúng tôi coi trọng sự riêng tư của bạn. Chính sách Bảo mật này giải thích cách chúng tôi thu thập, sử dụng, tiết lộ và bảo vệ thông tin của bạn khi bạn truy cập nền tảng của chúng tôi."}
            </p>

            <div className="grid gap-8">
              {sections.map((section, idx) => (
                <div key={idx} className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-zinc-50 flex items-center justify-center">
                    {section.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 mb-2 uppercase tracking-tight">
                      {section.title}
                    </h3>
                    <p className="text-zinc-600 leading-relaxed text-sm sm:text-base">
                      {section.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16 p-8 bg-zinc-50 rounded-3xl border border-zinc-100">
              <h3 className="text-lg font-black text-zinc-900 mb-4 uppercase tracking-tight">
                {lang === 'en' ? "Contact Us" : "Liên hệ với chúng tôi"}
              </h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                {lang === 'en'
                  ? "If you have any questions about this Privacy Policy, please contact us at privacy@dreamtoon.com."
                  : "Nếu bạn có bất kỳ câu hỏi nào về Chính sách Bảo mật này, vui lòng liên hệ với chúng tôi tại privacy@dreamtoon.com."}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

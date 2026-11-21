export interface ContractClause {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}

export function buildStrictContractClauses(singleCopyPrice?: number | null, currency = "EGP"): ContractClause[] {
  const hasPrice = typeof singleCopyPrice === "number" && singleCopyPrice > 0;
  const total10 = hasPrice ? (singleCopyPrice * 10).toFixed(2) : null;
  const priceNoteAr = hasPrice
    ? ` (سعر النسخة الواحدة المعتمد: ${singleCopyPrice} ${currency}، بإجمالي ${total10} ${currency} للنسخ العشر)`
    : " (يُحدد سعر النسخة الواحدة من قِبل الإدارة عند تجهيز العقد)";
  const priceNoteEn = hasPrice
    ? ` (Approved single-copy price: ${singleCopyPrice} ${currency}, total for 10 copies: ${total10} ${currency})`
    : " (Single-copy price is set by Admin upon contract preparation)";

  return [
    {
      titleAr: "أولاً (التكليف والنشر الحصري):",
      titleEn: "1. Exclusive Grant of Publishing Rights:",
      bodyAr:
        "يعهد الطرف الأول (المؤلف) للطرف الثاني (دار عبيد للنشر والتوزيع / منصة unibook) بنشر وتوزيع كتابه المذكور أعلاه رقمياً وورقياً عبر المنصة وشبكة التوزيع، وتكون حقوق النشر والتوزيع حصرية للطرف الثاني طوال مدة التعاقد.",
      bodyEn:
        "The Author grants Dar Obaid / unibook exclusive rights to publish and distribute the book digitally and in print throughout the contract term.",
    },
    {
      titleAr: "ثانياً (نسب الأرباح):",
      titleEn: "2. Revenue Split:",
      bodyAr:
        "يحصل المؤلف على 70% من صافي مبيعات النسخة الرقمية (و30% للدار)، وعلى 30% من مبيعات النسخة الورقية (و70% للدار لتغطية تكاليف الطباعة والتوزيع والشحن).",
      bodyEn:
        "Author receives 70% of net digital sales (30% Publisher) and 30% of print sales (70% Publisher to cover printing, distribution, and shipping).",
    },
    {
      titleAr: "ثالثاً (تحمّل طباعة 10 نسخ وتوزيعها):",
      titleEn: "3. Author Responsibility for 10 Printed Copies:",
      bodyAr: `يتحمل الطرف الأول (المؤلف) تكلفة طباعة عدد (10) نسخ ورقية من الكتاب لدى الدار${priceNoteAr}، وذلك لتوزيعها على النحو التالي: (5) نسخ تُرسل لدار الكتب والوثائق للإيداع القانوني، و(3) نسخ لدار النشر، و(2) نسختان للمؤلف.`,
      bodyEn: `The Author bears the printing cost of 10 physical copies${priceNoteEn}, distributed strictly as: 5 copies to the National Library (Dar Al-Kutub), 3 copies to the Publishing House, and 2 copies to the Author.`,
    },
    {
      titleAr: "رابعاً (مدة العقد وعدم السحب المنفرد):",
      titleEn: "4. Binding 5-Year Term & Non-Withdrawal:",
      bodyAr:
        "مدة هذا العقد 5 سنوات ميلادية تبدأ من تاريخ التوقيع الإلكتروني والاعتماد، ولا يجوز للطرف الأول فسخ العقد أو سحب الكتاب أو التعاقد مع أي ناشر أو منصة أخرى أو نشره مجاناً خلال هذه المدة دون موافقة كتابية مسبقة من الطرف الثاني.",
      bodyEn:
        "This contract runs for 5 calendar years from electronic execution. The Author may not unilaterally withdraw the book or publish it elsewhere during this term without prior written consent.",
    },
    {
      titleAr: "خامساً (التحاسب المالي):",
      titleEn: "5. Monthly Settlement:",
      bodyAr:
        "يتم التحاسب وصرف المستحقات في نهاية كل شهر (يوم 30 من كل شهر وآخر يوم في فبراير بتوقيت القاهرة) بعد استقطاع أي ضرائب أو رسوم قانونية أو بنكية إن وجدت.",
      bodyEn:
        "Settlement occurs at the end of every month (day 30, or last day of February, Cairo time) after deducting applicable taxes or fees.",
    },
    {
      titleAr: "سادساً (الشرط الجزائي والتعويض عن الإخلال):",
      titleEn: "6. Breach Penalty & Cost Reimbursement:",
      bodyAr:
        "في حال إخلال الطرف الأول بأي بند من بنود هذا العقد أو سحب الكتاب أو نشره لدى جهة أخرى خلال مدة التعاقد، يلتزم بسداد كامل تكاليف الإنتاج والتصميم والتدقيق والطباعة والتسويق التي تكبدتها الدار مضافاً إليها تعويض اتفاقي عادل، مع حق الدار في إيقاف المستحقات وحجب العمل واتخاذ الإجراءات القانونية.",
      bodyEn:
        "Upon breach or unauthorized publication elsewhere during the term, the Author must reimburse all production, design, editing, printing, and marketing costs plus liquidated damages, and the Publisher may withhold payouts and take legal action.",
    },
    {
      titleAr: "سابعاً (الأصالة والملكية الفكرية والمسؤولية القانونية):",
      titleEn: "7. Originality, IP & Legal Liability:",
      bodyAr:
        "يقر الطرف الأول بأن الكتاب من إبداعه الأصيل ولم يسبق نشره أو التنازل عن حقوقه لجهة أخرى، ويتحمل وحده المسؤولية القانونية والجنائية والمدنية الكاملة عن مضمون الكتاب وأي مطالبات تتعلق بحقوق الغير أو الاقتباس أو مخالفة النظام العام، دون أدنى مسؤولية على الطرف الثاني.",
      bodyEn:
        "The Author warrants the work is original and unpublished elsewhere, and bears sole legal liability for its content and any third-party IP claims.",
    },
    {
      titleAr: "ثامناً (حماية الشعار والهوية البصرية):",
      titleEn: "8. Brand & Design Protection:",
      bodyAr:
        "عند انتهاء مدة العقد ورغبة الطرف الأول في نشر الكتاب بمعرفته أو لدى ناشر آخر، يُحظر عليه تماماً استخدام غلاف الدار أو تصميمها الداخلي أو شعار أو اسم أو هوية الطرف الثاني.",
      bodyEn:
        "After contract expiration, the Author may not reuse Dar Obaid / unibook covers, interior layouts, logos, or brand identity.",
    },
    {
      titleAr: "تاسعاً (البيانات والهوية وحجية التوقيع الإلكتروني والاختصاص القضائي):",
      titleEn: "9. Identity Verification, E-Signature & Jurisdiction:",
      bodyAr:
        "يقر الطرف الأول بصحة الصورة الشخصية (4×6) وصورة البطاقة/الهوية (الأمامية والخلفية) أو جواز السفر وبيانات العنوان والتواصل المرفقة بهذا العقد، وتُعد موافقته وإقراره وتوقيعه الإلكتروني ملزمة قانوناً ونافذة وفقاً لقانون التوقيع الإلكتروني، وتختص المحاكم المصرية المختصة بنظر أي نزاع ينشأ عن تنفيذ هذا العقد.",
      bodyEn:
        "The Author certifies the authenticity of the attached 4x6 photo, ID/passport images, address, and contact details. Electronic signature is legally binding under Egyptian e-signature law and subject to Egyptian courts.",
    },
  ];
}

export const STRICT_CONTRACT_CLAUSES = buildStrictContractClauses();

import type { Job } from '../types';

export type CreativeAngle = 'tech_challenge' | 'perks_comp' | 'culture_genz' | 'headhunter' | 'storytelling';

export interface AngleInfo {
  id: CreativeAngle;
  name: string;
  badge: string;
  description: string;
}

export const CREATIVE_ANGLES: AngleInfo[] = [
  {
    id: 'tech_challenge',
    name: 'Kỹ thuật & Thử thách lớn',
    badge: '⚡ Tech & Scale Hook',
    description: 'Tập trung vào giải quyết bài toán hóc búa, hạ tầng quy mô và stack công nghệ đỉnh cao.',
  },
  {
    id: 'perks_comp',
    name: 'Lương thưởng & Đãi ngộ khủng',
    badge: '💎 Perks & Comp Hook',
    description: 'Đánh thẳng vào mức đãi ngộ cạnh tranh, thưởng dự án, review lương và phúc lợi cao cấp.',
  },
  {
    id: 'culture_genz',
    name: 'Văn hóa Gen Z & Đồng đội',
    badge: '🔥 Culture & Vibes Hook',
    description: 'Phong cách trẻ trung, hóm hỉnh, làm hết sức chơi hết mình, môi trường không drama.',
  },
  {
    id: 'headhunter',
    name: 'Săn Lãnh đạo & Tầm ảnh hưởng',
    badge: '👑 Headhunter / Leadership',
    description: 'Tìm kiếm nhân sự nòng cốt, trao quyền tự quyết, cơ hội thăng tiến và định hình sản phẩm.',
  },
  {
    id: 'storytelling',
    name: 'Kể chuyện Sản phẩm & Sứ mệnh',
    badge: '📖 Storytelling & Mission',
    description: 'Khởi đầu bằng câu chuyện thực tế về hành trình phát triển sản phẩm và mục tiêu phụng sự.',
  },
];

// Helper chọn ngẫu nhiên từ mảng
function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// 1. SINH BẢN JD DOANH NGHIỆP CHI TIẾT (ENTERPRISE JOB DESCRIPTION SPECIFICATION)
export function generateEnterpriseJD(job: Job): string {
  const { title, department, description, criteria, created_at } = job;
  const skillsStr = criteria.required_skills.join(', ');
  const prefSkillsStr = criteria.preferred_skills.length > 0 ? criteria.preferred_skills.join(', ') : 'Không bắt buộc';
  const expYears = criteria.min_years_experience;
  const edu = criteria.education_level || 'Đại học chuyên ngành liên quan';
  const weights = criteria.weights || { skills: 0.5, experience: 0.3, education: 0.2 };

  return `================================================================================
                    BẢN MÔ TẢ CÔNG VIỆC VÀ TIÊU CHUẨN CHỨC DANH
                         (JOB DESCRIPTION & SPECIFICATION)
================================================================================

I. TỔNG QUAN VỊ TRÍ TUYỂN DỤNG
--------------------------------------------------------------------------------
- Vị trí chức danh: ${title.toUpperCase()}
- Phòng ban / Khối: ${department || 'Khối Công nghệ & Kỹ thuật'}
- Cấp bậc: Chuyên viên / Kỹ sư Cấp cao (Senior / Lead Specialist)
- Mô hình làm việc: Toàn thời gian (Hybrid / Linh hoạt kết hợp Onsite & Remote)
- Ngày lập tiêu chuẩn: ${new Date(created_at).toLocaleDateString('vi-VN')}
- Mã tham chiếu nội bộ: JD-${job.id.substring(0, 8).toUpperCase()}

II. MỤC TIÊU & SỨ MỆNH CÔNG VIỆC (JOB MISSION)
--------------------------------------------------------------------------------
${description ? description : `Chịu trách nhiệm trực tiếp trong việc phân tích, thiết kế, hiện thực hóa các giải pháp phần mềm cốt lõi; nâng cao độ tin cậy và khả năng mở rộng của hệ thống công nghệ thông tin phục vụ chiến lược kinh doanh của doanh nghiệp.`}

III. TRÁCH NHIỆM & NHIỆM VỤ CỤ THỂ (KEY RESPONSIBILITIES)
--------------------------------------------------------------------------------
1. Thiết kế & Phát triển:
   - Trực tiếp tham gia nghiên cứu, phát triển và làm chủ kiến trúc các module trọng yếu.
   - Ứng dụng thành thạo các công nghệ chủ đạo: ${skillsStr}.
   - Đảm bảo mã nguồn (Clean Code) tuân thủ nghiêm ngặt các quy chuẩn bảo mật và hiệu năng cao.

2. Quản trị Chất lượng & Vận hành:
   - Tham gia rà soát mã nguồn (Code Review), kiểm thử tự động (Unit Test / Integration Test).
   - Giám sát, phát hiện và khắc phục nhanh chóng các sự cố phát sinh trên môi trường Production.
   - Tối ưu hóa truy vấn cơ sở dữ liệu và cải thiện độ trễ phản hồi hệ thống.

3. Hợp tác & Phối hợp Liên chức năng:
   - Phối hợp chặt chẽ với Product Owner, Solution Architect và đội ngũ QA/DevOps theo quy trình Agile/Scrum.
   - Đề xuất các cải tiến kỹ thuật, cập nhật công nghệ mới nhằm nâng cao năng suất toàn đội ngũ.

IV. TIÊU CHUẨN NĂNG LỰC & YÊU CẦU ỨNG VIÊN (REQUIREMENTS)
--------------------------------------------------------------------------------
1. Kinh nghiệm chuyên môn:
   - Tối thiểu ${expYears} năm kinh nghiệm làm việc thực tế ở vị trí tương đương.
   - Đã từng tham gia vào các dự án có quy mô từ vừa đến lớn, chịu tải cao và yêu cầu tính sẵn sàng liên tục.

2. Kỹ năng kỹ thuật bắt buộc:
   - Nắm vững và làm chủ: ${skillsStr}.

3. Kỹ năng ưu tiên (Điểm thưởng):
   - Có kinh nghiệm với: ${prefSkillsStr}.

4. Trình độ học vấn & Kỹ năng bổ trợ:
   - Trình độ: Tốt nghiệp ${edu}.
   - Tư duy phản biện logic, kỹ năng giải quyết vấn đề dưới áp lực tốt.
   - Tinh thần chủ động, trách nhiệm cao và khả năng đọc hiểu tài liệu chuyên ngành tốt.

5. Trọng số đánh giá năng lực tuyển dụng (AI Screening Distribution):
   - Tiêu chí Kỹ năng (Skills): ${Math.round(weights.skills * 100)}%
   - Tiêu chí Kinh nghiệm (Experience): ${Math.round(weights.experience * 100)}%
   - Tiêu chí Học vấn (Education): ${Math.round(weights.education * 100)}%

V. CHẾ ĐỘ ĐÃI NGỘ & LỘ TRÌNH PHÁT TRIỂN (BENEFITS & PERKS)
--------------------------------------------------------------------------------
- Thu nhập hấp dẫn: Lương cạnh tranh theo năng lực ($1,500 - $3,500+) + Thưởng hiệu suất dự án.
- Lương tháng 13, thưởng các dịp Lễ / Tết và đánh giá tăng lương định kỳ 2 lần/năm.
- Chế độ bảo hiểm: Đầy đủ BHXH, BHYT theo luật định + Gói Bảo hiểm Sức khỏe Cao cấp (PVI / Bảo Việt).
- Trang thiết bị: Cấp phát Laptop cấu hình cao (MacBook Pro / ThinkPad) và màn hình đồ họa chuyên dụng.
- Đào tạo & Phát triển: Tài trợ 100% ngân sách thi chứng chỉ quốc tế và các khóa học nâng cao tay nghề.
- Môi trường & Đời sống: Du lịch teambuilding hàng năm, câu lạc bộ thể thao, pantry trà nước miễn phí.

VI. QUY TRÌNH PHỎNG VẤN & ỨNG TUYỂN (HIRING PROCESS)
--------------------------------------------------------------------------------
- Vòng 1: Thẩm định hồ sơ bằng AI Screening & Đội ngũ Tuyển dụng (Trong 24h).
- Vòng 2: Phỏng vấn Chuyên môn kỹ thuật với Technical Lead / Head of Engineering.
- Vòng 3: Thảo luận Văn hóa, định hướng phát triển & Thỏa thuận Offer đãi ngộ.
- Kênh nộp hồ sơ: Gửi CV trực tiếp qua hệ thống hoặc email: tuyendung@doanhnghiep.com

================================================================================
              TÀI LIỆU TIÊU CHUẨN LƯU HÀNH NỘI BỘ VÀ CỔNG TUYỂN DỤNG
================================================================================`;
}

function buildLinksFooter(jdPdfUrl?: string, applyFormUrl?: string): string {
  const parts: string[] = [];
  if (jdPdfUrl?.trim()) {
    parts.push(`📄 Chi tiết bản JD công việc: ${jdPdfUrl.trim()}`);
  }
  if (applyFormUrl?.trim()) {
    parts.push(`👉 Ứng tuyển & Nộp CV trực tiếp tại: ${applyFormUrl.trim()}`);
  }
  if (parts.length === 0) return '';
  return `\n\n--------------------------------------------------\n${parts.join('\n')}\n--------------------------------------------------`;
}

// 2. SINH TIN ĐĂNG SÁNG TẠO DYNAMIC RANDOM CHO CÁC NỀN TẢNG
export function generateDynamicCreativePost(
  job: Job,
  platform: 'linkedin' | 'topcv' | 'social',
  angle: CreativeAngle,
  links?: { jdPdfUrl?: string; applyFormUrl?: string }
): string {
  const { title, department, description, criteria } = job;
  const skillsList = criteria.required_skills.join(', ');
  const prefSkillsList = criteria.preferred_skills.length > 0 ? criteria.preferred_skills.join(', ') : '';
  const expYears = criteria.min_years_experience;
  const edu = criteria.education_level || 'Đại học chuyên ngành';
  const footer = buildLinksFooter(links?.jdPdfUrl, links?.applyFormUrl);

  const getPost = (): string => {

  switch (angle) {
    case 'tech_challenge': {
      const hooks = [
        `⚡ BÀI TOÁN SCALE HỆ THỐNG TRIỆU USERS ĐANG CHỜ LỜI GIẢI TỪ BẠN: ${title.toUpperCase()}!`,
        `🛠️ DÀNH RIÊNG CHO ANH EM TECH ĐAM MÊ GIẢI QUYẾT BÀI TOÁN LỚN: TÌM KIẾM ${title.toUpperCase()}`,
        `🚀 HẠ TẦNG PHỨC TẠP, CÔNG NGHỆ HIỆN ĐẠI – ĐÂY CÓ PHẢI BÃI CHIẾN TRƯỜNG BẠN TÌM KIẾM? [${title.toUpperCase()}]`,
      ];
      const intros = [
        `Tại ${department || 'Khối Kỹ thuật'}, chúng mình không xây dựng những hệ thống tầm thường. Chúng mình đối mặt với bài toán tối ưu độ trễ micro-seconds, xử lý dữ liệu quy mô lớn và kiến trúc phân tán.`,
        `Nếu bạn đã chán với những công việc lặp đi lặp lại và muốn cọ xát với kiến trúc chịu tải cao, môi trường của chúng mình chính là nơi bạn phát huy tối đa thực lực.`,
      ];
      const chosenHook = pickRandom(hooks);
      const chosenIntro = pickRandom(intros);

      if (platform === 'linkedin') {
        return `${chosenHook}

${chosenIntro}

💡 Tech Stack Cốt Lõi:
🔹 Chuyên môn: ${skillsList}
${prefSkillsList ? `🔹 Điểm cộng kinh nghiệm: ${prefSkillsList}\n` : ''}🔹 Kinh nghiệm tối thiểu: ${expYears}+ năm thực chiến
🔹 Học vấn & Nền tảng: ${edu}

🎯 Trọng trách của bạn:
• Trực tiếp thiết kế kiến trúc và giải quyết các nút thắt cổ chai về hiệu năng.
• Phối hợp xây dựng hệ thống đạt chuẩn 99.99% uptime.
• Định hình tiêu chuẩn kỹ thuật và mentorship cho lứa kỹ sư kế cận.

💎 Đãi ngộ xứng tầm:
- Lương thỏa thuận minh bạch theo năng lực ($1,800 - $3,500+)
- Thưởng milestone dự án, thưởng hiệu suất định kỳ
- Ngân sách tham dự hội thảo công nghệ quốc tế và thi chứng chỉ

📩 Apply trực tiếp hoặc trao đổi nhanh: tuyendung@company.com
#TechHiring #${title.replace(/\s+/g, '')} #HighScale #Architecture #SoftwareEngineering`;
      }

      if (platform === 'topcv') {
        return `[TUYỂN GẤP KỸ THUẬT CAO] ${title.toUpperCase()} - THU NHẬP LÊN ĐẾN 80 TRIỆU/THÁNG

1. THÔNG TIN CHUNG:
- Vị trí: ${title}
- Phòng ban: ${department || 'Kỹ thuật'}
- Địa điểm: Hà Nội / TP.HCM (Hỗ trợ Hybrid linh hoạt)

2. THÁCH THỨC VÀ BÀI TOÁN DỰ ÁN:
- ${chosenIntro}
- Nắm quyền kiến trúc các module cốt lõi sử dụng: ${skillsList}.

3. TIÊU CHUẨN ỨNG VIÊN:
- Có từ ${expYears} năm kinh nghiệm thực chiến phát triển hệ thống.
- Sử dụng thành thạo: ${skillsList}.
${prefSkillsList ? `- Ưu tiên ứng viên có kinh nghiệm: ${prefSkillsList}.\n` : ''}- Nền tảng học vấn: ${edu}.

4. ĐÃI NGỘ NỔI BẬT:
- Thu nhập cạnh tranh cao, review lương 2 lần/năm.
- Thưởng nóng dự án, thưởng tháng 13+.
- Gói chăm sóc sức khỏe toàn diện PVI.

Ứng tuyển ngay để không bỏ lỡ cơ hội bứt phá sự nghiệp!`;
      }

      // Social
      return `${chosenHook}

${chosenIntro}

⚙️ VŨ KHÍ BẠN CẦN:
✅ Thành thạo chiến thuật với: ${skillsList}
${prefSkillsList ? `✅ Điểm cộng thêm: ${prefSkillsList}\n` : ''}✅ Tối thiểu ${expYears} năm kinh nghiệm thực chiến
✅ Tốt nghiệp ${edu}

🎁 ĐÃI NGỘ XỨNG ĐÁNG CHO CAO THỦ:
💰 Thu nhập deal thẳng theo năng lực (Up to $3,500)
💻 Cấp MacBook Pro M-series + Màn hình rời xịn
🏖️ Du lịch nghỉ dưỡng 5 sao, teambuilding hàng quý

📩 Gửi CV chiến ngay: tuyendung@company.com
Tag ngay cạ cứng kỹ thuật đang tìm bến đỗ mới vào đây nhé! 👇`;
    }

    case 'perks_comp': {
      const hooks = [
        `💰 ĐÃI NGỘ ĐỈNH CHÓP - THƯỞNG KHỦNG: CƠ HỘI GIA NHẬP VỚI VỊ TRÍ ${title.toUpperCase()}!`,
        `✨ BẠN XỨNG ĐÁNG NHẬN ĐƯỢC MỨC THU NHẬP VƯỢT TRỘI: ${title.toUpperCase()} ĐANG MỞ CỬA!`,
        `🚀 REVIEW LƯƠNG 2 LẦN/NĂM, THƯỞNG DỰ ÁN KHÔNG GIỚI HẠN: CHÀO ĐÓN ${title.toUpperCase()}`,
      ];
      const chosenHook = pickRandom(hooks);

      if (platform === 'linkedin') {
        return `${chosenHook}

Chúng mình tin rằng đãi ngộ xứng đáng là nền tảng tốt nhất cho sự sáng tạo và cống hiến bền bỉ. Tại ${department || 'công ty'}, mức thu nhập của bạn sẽ luôn đi cùng với giá trị bạn tạo ra!

💼 Vị trí: ${title}
🏢 Phòng ban: ${department || 'Công nghệ'}
💵 Mức lương: Đề xuất cạnh tranh $1,800 - $3,500 (Gross/Net rõ ràng)

🎁 Gói Phúc Lợi Toàn Diện:
✅ Thưởng tháng 13, thưởng KPI hiệu suất hàng quý, thưởng nóng dự án.
✅ Review lương định kỳ 6 tháng/lần - không giới hạn trần tăng trưởng.
✅ Bảo hiểm sức khỏe VIP cho cá nhân và trợ cấp người thân.
✅ Thời gian làm việc linh hoạt (Flexible Hours) & Hybrid 2 ngày/tuần.
✅ Cấp mới thiết bị làm việc hiện đại theo yêu cầu.

🎯 Yêu cầu năng lực:
• ${expYears}+ năm kinh nghiệm chuyên môn vững vàng.
• Thành thạo bộ kỹ năng: ${skillsList}.
${prefSkillsList ? `• Điểm cộng: ${prefSkillsList}.\n` : ''}• Bằng cấp: ${edu}.

📩 Inbox trao đổi bảo mật hoặc gửi hồ sơ về: hr@company.com
#HighSalary #PerksAndBenefits #JobOpportunity #${title.replace(/\s+/g, '')}`;
      }

      return `${chosenHook}

Nếu bạn đang tìm kiếm một bến đỗ công nhận đúng giá trị của bạn bằng hành động cụ thể và con số thực tế:

🌟 QUYỀN LỢI ĐẶC QUYỀN:
💎 Thu nhập cạnh tranh cao nhất thị trường ($1,500 - $3,500+)
💎 Thưởng tháng 13 + Thưởng lợi nhuận dự án
💎 Chế độ bảo hiểm sức khỏe quốc tế cao cấp
💎 Lộ trình thăng tiến minh bạch, review lương 2 lần/năm

📋 TIÊU CHUẨN TUYỂN DỤNG:
- Vị trí: ${title} (${department || 'Công nghệ'})
- Kinh nghiệm: Từ ${expYears} năm trở lên
- Kỹ năng cốt lõi: ${skillsList}
${prefSkillsList ? `- Kỹ năng ưu tiên: ${prefSkillsList}\n` : ''}- Trình độ: ${edu}

👉 Ứng tuyển ngay hôm nay: tuyendung@company.com!`;
    }

    case 'culture_genz': {
      const hooks = [
        `🔥 TÌM ĐỒNG ĐỘI "HỢP VIBE": ${title.toUpperCase()} VỀ CHUNG NHÀ TRÀ SỮA & CÔNG NGHỆ! 🔥`,
        `🥳 LÀM HẾT SỨC - CHƠI HẾT MÌNH: TEAM ĐANG TRỐNG 1 GHẾ CHO ${title.toUpperCase()}`,
        `🌈 KHÔNG DRAMA, SẾP TÂM LÝ, ĐỒNG ĐỘI DỄ THƯƠNG: GIA NHẬP VỊ TRÍ ${title.toUpperCase()} NGAY!`,
      ];
      const chosenHook = pickRandom(hooks);

      return `${chosenHook}

Team mình đang tìm kiếm một người bạn đồng hành cho vị trí ${title} (${department || 'Công nghệ'}) - không chỉ giỏi chuyên môn mà còn vui vẻ, nhiệt huyết và hợp gu!

🍕 VỀ ĐỘI CỦA CHÚNG MÌNH BẠN SẼ CÓ GÌ?
✨ Văn hóa phẳng, sếp lắng nghe, không quan liêu, không drama.
✨ Pantry đầy ắp bánh kẹo, hoa quả và cà phê tiếp năng lượng 24/7.
✨ Happy Hour thứ 6 hàng tuần, teambuilding tẹt ga, du lịch nghỉ dưỡng xịn sò.
✨ Lương thưởng hấp dẫn, xứng đáng từng giọt mồ hôi chất xám.
✨ Được tự do thử nghiệm công nghệ mới, sai thì sửa cùng nhau.

🎯 CHỈ CẦN BẠN:
✅ Đã có từ ${expYears} năm lăn lộn trong nghề.
✅ Chiến tốt các món: ${skillsList}.
${prefSkillsList ? `✅ Nếu biết thêm về ${prefSkillsList} thì 10 điểm không có nhưng!\n` : ''}✅ Tốt nghiệp ${edu}.

👉 Nộp CV liền tay: tuyendung@company.com!
Đừng quên tag hội bạn thân đang tìm việc vào chung vui nhé! 🚀`;
    }

    case 'headhunter': {
      const hooks = [
        `👑 TÌM KIẾM THỦ LĨNH KỸ THUẬT: VỊ TRÍ CHIẾN LƯỢC ${title.toUpperCase()}`,
        `🎯 CƠ HỘI ĐỊNH HÌNH SẢN PHẨM & DẪN DẮT ĐỘI NGŨ: ${title.toUpperCase()}`,
        `⚡ TRAO QUYỀN TỰ QUYẾT & BỨT PHÁ GIỚI HẠN SỰ NGHIỆP: [${title.toUpperCase()}]`,
      ];
      const chosenHook = pickRandom(hooks);

      return `${chosenHook}

Chúng tôi không tìm kiếm một người chỉ thừa hành mệnh lệnh. Chúng tôi tìm kiếm một nhân sự hạt nhân có tư duy chiến lược để dẫn dắt giải pháp kỹ thuật và định hình tương lai sản phẩm.

💼 Vị trí: ${title}
🏛️ Khối: ${department || 'Engineering Leadership'}

🔑 TẦM ẢNH HƯỞNG CỦA BẠN:
- Toàn quyền quyết định kiến trúc kỹ thuật và giải pháp công nghệ.
- Trực tiếp xây dựng văn hóa kỹ thuật chuẩn mực và dẫn dắt các kỹ sư tài năng.
- Đồng hành cùng ban giám đốc trong các quyết định phát triển dài hạn.

🔍 CHÂN DUNG ỨNG VIÊN LÝ TƯỞNG:
- Tối thiểu ${expYears}+ năm kinh nghiệm sâu sắc trong lĩnh vực.
- Am hiểu chuyên sâu và thực chiến vững vàng với: ${skillsList}.
${prefSkillsList ? `- Lợi thế nếu có nền tảng về: ${prefSkillsList}.\n` : ''}- Trình độ học vấn: ${edu}.
- Tư duy sản phẩm nhạy bén, khả năng truyền cảm hứng và tinh thần làm chủ cao.

💼 ĐÃI NGỘ DÀNH CHO LÃNH ĐẠO:
- Thu nhập không giới hạn trần, đàm phán trực tiếp theo tầm nhìn.
- Gói cổ phần / ESOP gắn liền với giá trị gia tăng của công ty.
- Toàn quyền xây dựng đội ngũ và chọn lựa công cụ làm việc.

Trao đổi trực tiếp và bảo mật: headhunt@company.com / Hotline: 0988.xxx.xxx`;
    }

    case 'storytelling': {
      const hooks = [
        `📖 CÂU CHUYỆN ĐẰNG SAU HÀNH TRÌNH TĂNG TRƯỞNG: TẠI SAO CHÚNG TÔI CẦN BẠN [${title.toUpperCase()}]?`,
        `🌱 MỖI DÒNG CODE LÀ MỘT GIÁ TRỊ: HÀNH TRÌNH TÌM KIẾM ${title.toUpperCase()}`,
      ];
      const chosenHook = pickRandom(hooks);

      return `${chosenHook}

Ba năm trước, chúng tôi khởi đầu với một ước mơ khiêm tốn: tạo ra sản phẩm công nghệ giúp hàng triệu người dùng giải quyết vấn đề của họ một cách đơn giản nhất.

Hôm nay, khi quy mô tăng trưởng gấp nhiều lần, những thử thách kỹ thuật mới xuất hiện mỗi ngày. Chúng tôi nhận ra rằng, điều tạo nên sự khác biệt của công ty không phải là máy móc, mà là những con người ngồi phía sau màn hình.

Và hôm nay, chúng tôi mở rộng cánh cửa đón chào vị trí: ${title.toUpperCase()}.

${description ? `Bối cảnh công việc: ${description}\n` : ''}
Bạn sẽ đồng hành cùng chúng tôi nếu bạn có:
- Trái tim nhiệt huyết và tối thiểu ${expYears} năm kinh nghiệm thực chiến.
- Khả năng làm chủ và sáng tạo cùng: ${skillsList}.
${prefSkillsList ? `- Những góc nhìn bổ trợ quý báu từ: ${prefSkillsList}.\n` : ''}- Nền tảng học vấn vững chắc từ ${edu}.

Chúng tôi không hứa con đường này sẽ dễ dàng, nhưng chúng tôi cam kết bạn sẽ được tưởng thưởng xứng đáng, được làm việc cùng những đồng đội xuất sắc nhất và tự hào về từng sản phẩm mình tạo ra.

Viết tiếp chương tiếp theo cùng chúng tôi: tuyendung@company.com
#OurStory #JoinUs #${title.replace(/\s+/g, '')} #MissionDriven`;
    }
  }
  };

  return `${getPost()}${footer}`;
}

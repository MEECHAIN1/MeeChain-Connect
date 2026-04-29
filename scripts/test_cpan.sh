#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "🚀 เริ่มทดสอบ CPAN..."
echo "-----------------------------------"

# 1) ตรวจสอบ Perl และ CPAN
perl -v | grep "perl"
cpan -v | grep "CPAN"

# 2) ติดตั้งโมดูลพื้นฐาน
cpan install Try::Tiny
cpan install JSON
cpan install LWP::UserAgent

# 3) ตรวจสอบการโหลดโมดูล
perl -MTry::Tiny -e1 && echo "✅ Try::Tiny OK"
perl -MJSON -e1 && echo "✅ JSON OK"
perl -MLWP::UserAgent -e1 && echo "✅ LWP::UserAgent OK"

echo "-----------------------------------"
echo "🎉 CPAN พร้อมใช้งานแล้ว → Badge Claimed!"

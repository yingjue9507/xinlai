const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTestAnnouncements() {
  try {
    console.log('🔍 检查现有用户...');
    
    // 获取现有用户
    const users = await prisma.user.findMany();
    console.log('👥 找到用户数量:', users.length);
    
    if (users.length === 0) {
      console.log('❌ 没有找到用户，请先登录创建用户');
      return;
    }

    const testUser = users[0]; // 使用第一个用户
    console.log('👤 使用用户:', testUser.phoneNumber);

    // 创建测试公告
    const testAnnouncements = [
      {
        userId: testUser.id,
        title: '张三喜结良缘',
        content: '张三与李四将于本月28日举办婚礼，诚邀各位亲朋好友参加！',
        eventType: '红事',
        eventDate: new Date('2025-11-28'),
        location: '金色阳光大酒店',
        contactInfo: '13800138001'
      },
      {
        userId: testUser.id,
        title: '王五乔迁新居',
        content: '王五一家搬入新居，特设宴庆祝，欢迎大家光临！',
        eventType: '红事',
        eventDate: new Date('2025-12-01'),
        location: '幸福小区15栋',
        contactInfo: '13800138002'
      },
      {
        userId: testUser.id,
        title: '赵六老人仙逝',
        content: '赵六老人于昨日安详离世，享年85岁，追悼会将于明日举行。',
        eventType: '白事',
        eventDate: new Date('2025-11-27'),
        location: '市殡仪馆',
        contactInfo: '13800138003'
      },
      {
        userId: testUser.id,
        title: '孙七喜得贵子',
        content: '孙七家喜添男丁，满月酒将于下月初举办，敬请光临！',
        eventType: '红事',
        eventDate: new Date('2025-12-05'),
        location: '家中设宴',
        contactInfo: '13800138004'
      },
      {
        userId: testUser.id,
        title: '周八生日庆典',
        content: '周八60大寿，特设寿宴庆祝，诚邀各位好友共同庆贺！',
        eventType: '红事',
        eventDate: new Date('2025-12-10'),
        location: '龙凤酒楼',
        contactInfo: '13800138005'
      }
    ];

    console.log('🆕 开始创建测试公告...');
    
    for (const announcement of testAnnouncements) {
      const created = await prisma.announcement.create({
        data: announcement
      });
      console.log(`✅ 创建公告: ${created.title}`);
    }

    console.log('🎉 测试公告创建完成！');
    
  } catch (error) {
    console.error('❌ 创建测试公告失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestAnnouncements();

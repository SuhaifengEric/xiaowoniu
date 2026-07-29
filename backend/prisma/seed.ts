import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/utils/password'

const prisma = new PrismaClient()

async function main() {
  console.log('开始创建种子数据...')

  // 创建测试用户
  const hashedPassword = await hashPassword('password123')

  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      nickname: '测试用户',
    },
  })

  console.log('创建测试用户:', user.email)
  console.log('种子数据创建完成！')
}

main()
  .catch((e) => {
    console.error('种子数据创建失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

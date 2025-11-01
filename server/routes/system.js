import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { getCpuLoad, getDiskUsage, getMemoryUsage, getSystemMeta } from '../utils/systemInfo.js'

const router = Router()

router.get('/status', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const [disk, memory] = await Promise.all([
      getDiskUsage().catch(() => null),
      Promise.resolve(getMemoryUsage()),
    ])

    const cpu = getCpuLoad()
    const meta = getSystemMeta()

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        disk,
        memory,
        cpu,
        meta,
      },
    })
  } catch (error) {
    console.error('[system] status error:', error?.message)
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงข้อมูลระบบได้' })
  }
})

export default router

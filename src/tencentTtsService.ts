import axios from 'axios'
import { formatDate, hmacSha256, sha256Hex } from './utils/crypto'

interface TencentTTSConfig {
  secretId: string
  secretKey: string
  voiceType?: number
  speed?: number
}

interface TencentVoiceOption {
  value: number
  label: string
}

const DEFAULT_ZH_VOICE = 501003
const DEFAULT_EN_VOICE = 501009

const VOICE_OPTIONS: TencentVoiceOption[] = [
  { value: 502001, label: '智小柔 - 聊天女声（超自然，中英文，推荐）' },
  { value: 501003, label: '智宇 - 阅读男生 - 大模型，推荐' },
  { value: 502003, label: '智小敏 - 聊天女声（超自然，中英文）' },
  { value: 502004, label: '智小满 - 营销女声（超自然，中英文）' },
  { value: 502005, label: '智小解 - 解说男声（超自然，中英文）' },
  { value: 502006, label: '智小悟 - 聊天男声（超自然，中英文）' },
  { value: 502007, label: '智小虎 - 聊天童声（超自然，中英文）' },
  { value: 602003, label: '爱小悠 - 聊天女声（超自然，中英文）' },
  { value: 602004, label: '暖心阿灿 - 聊天男声（超自然，中英文）' },
  { value: 602005, label: '专业梓欣 - 聊天女声（超自然，中英文）' },
  { value: 603004, label: '温柔小柠 - 聊天女声（超自然，中英文）' },
  { value: 603007, label: '邻家女孩 - 聊天女声（超自然，中英文）' },
  { value: 601008, label: '爱小豪 - 聊天男声（大模型，中文）' },
  { value: 601009, label: '爱小芊 - 聊天女声（大模型，中文）' },
  { value: 601010, label: '爱小娇 - 聊天女声（大模型，中文）' },
  { value: 501008, label: 'WeJames - 外语男声（大模型，英文）' },
  { value: 501009, label: 'WeWinny - 外语女声（大模型，英文，推荐）' },
]

export class TencentTTSService {
  private static instance: TencentTTSService
  private config: TencentTTSConfig = {
    secretId: '',
    secretKey: '',
    voiceType: DEFAULT_ZH_VOICE,
    speed: 1.0,
  }

  private constructor() {}

  static getInstance(): TencentTTSService {
    if (!TencentTTSService.instance) {
      TencentTTSService.instance = new TencentTTSService()
    }
    return TencentTTSService.instance
  }

  setConfig(config: TencentTTSConfig): void {
    this.config = {
      secretId: config.secretId?.trim() || '',
      secretKey: config.secretKey?.trim() || '',
      voiceType: config.voiceType || DEFAULT_ZH_VOICE,
      speed: config.speed || 1.0,
    }
  }

  isConfigured(): boolean {
    return Boolean(this.config.secretId && this.config.secretKey)
  }

  getConfiguredVoiceType(): number {
    return this.config.voiceType || DEFAULT_ZH_VOICE
  }

  getConfiguredSpeed(): number {
    return this.config.speed || 1.0
  }

  getDefaultVoiceByLanguage(language: 'zh' | 'en'): number {
    return language === 'zh' ? DEFAULT_ZH_VOICE : DEFAULT_EN_VOICE
  }

  getVoiceOptions(): TencentVoiceOption[] {
    return VOICE_OPTIONS
  }

  base64ToBuffer(base64Audio: string): Buffer {
    return Buffer.from(base64Audio, 'base64')
  }

  async textToSpeech(text: string, voiceType?: number, speed?: number): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('腾讯语音服务未配置，请先填写 SecretId 和 SecretKey')
    }

    const content = text.trim()
    if (!content) {
      throw new Error('合成文本不能为空')
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const date = formatDate(timestamp)
    const service = 'tts'
    const host = 'tts.tencentcloudapi.com'
    const action = 'TextToVoice'
    const version = '2019-08-23'
    const algorithm = 'TC3-HMAC-SHA256'
    const payload = JSON.stringify({
      Text: content,
      SessionId: `transgo-${Date.now()}`,
      Volume: 0,
      Speed: speed || this.getConfiguredSpeed(),
      ProjectId: 0,
      ModelType: 1,
      VoiceType: voiceType || this.getConfiguredVoiceType(),
      Codec: 'mp3',
    })

    const hashedRequestPayload = sha256Hex(payload)
    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\nx-tc-timestamp:${timestamp}\nx-tc-version:${version}\n`
    const signedHeaders = 'content-type;host;x-tc-action;x-tc-timestamp;x-tc-version'
    const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`
    const credentialScope = `${date}/${service}/tc3_request`
    const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`

    const secretDate = hmacSha256(`TC3${this.config.secretKey}`, date)
    const secretService = hmacSha256(secretDate, service)
    const secretSigning = hmacSha256(secretService, 'tc3_request')
    const signature = hmacSha256(secretSigning, stringToSign).toString('hex')
    const authorization = `${algorithm} Credential=${this.config.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    try {
      const response = await axios.post(`https://${host}/`, payload, {
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json; charset=utf-8',
          Host: host,
          'X-TC-Action': action,
          'X-TC-Timestamp': timestamp.toString(),
          'X-TC-Version': version,
          'X-TC-Region': 'ap-guangzhou',
        },
        timeout: 60000,
      })

      const apiResponse = response.data?.Response
      if (apiResponse?.Error) {
        throw new Error(`腾讯语音错误 (${apiResponse.Error.Code}): ${apiResponse.Error.Message}`)
      }

      if (typeof apiResponse?.Audio === 'string' && apiResponse.Audio) {
        return apiResponse.Audio
      }

      throw new Error('腾讯语音接口返回数据格式错误')
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('腾讯语音请求超时，请检查网络连接')
        }

        const apiError = error.response?.data?.Response?.Error
        if (apiError?.Code && apiError?.Message) {
          throw new Error(`腾讯语音错误 (${apiError.Code}): ${apiError.Message}`)
        }

        throw new Error(`腾讯语音网络请求失败: ${error.message}`)
      }

      throw error
    }
  }
}

Pod::Spec.new do |s|
  s.name           = 'StickerKit'
  s.version        = '1.0.0'
  s.summary        = 'Sticker pack export for WhatsApp and Telegram'
  s.description    = 'Sticker pack export for WhatsApp and Telegram'
  s.license        = 'MIT'
  s.author         = 'Stickere'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # WhatsApp only accepts WebP stickers, and iOS has no WebP encoder of its own.
  s.dependency 'libwebp'
  s.dependency 'libwebp/mux'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end

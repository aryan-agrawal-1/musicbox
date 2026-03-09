require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = package['name']
  s.version = package['version']
  s.summary = package['description']
  s.description = package['description']
  s.author = package['author']
  s.homepage = package['homepage']
  s.license = package['license']
  s.platform = :ios, '15.1'
  s.source = { :git => 'https://github.com/aryanagrawal5/musicbox.git' }
  s.static_framework = true
  s.swift_version = '5.9'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }

  s.dependency 'ExpoModulesCore'

  s.source_files = 'ios/**/*.{h,m,mm,swift,hpp,cpp}'
end

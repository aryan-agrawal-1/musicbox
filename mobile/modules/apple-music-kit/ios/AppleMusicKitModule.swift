import ExpoModulesCore
import MusicKit
import StoreKit

enum AppleMusicKitError: LocalizedError {
  case notAuthorized
  case missingUserToken

  var errorDescription: String? {
    switch self {
    case .notAuthorized:
      return "Apple Music access has not been authorized."
    case .missingUserToken:
      return "Apple Music did not return a user token."
    }
  }
}

public final class AppleMusicKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppleMusicKit")

    AsyncFunction("requestAuthorization") { () async -> String in
      let status = await MusicAuthorization.request()
      return Self.serialize(status)
    }

    AsyncFunction("getMusicUserToken") { (developerToken: String) async throws -> String in
      guard MusicAuthorization.currentStatus == .authorized else {
        throw AppleMusicKitError.notAuthorized
      }

      let controller = SKCloudServiceController()

      return try await withCheckedThrowingContinuation { continuation in
        controller.requestUserToken(forDeveloperToken: developerToken) { userToken, error in
          if let error {
            continuation.resume(throwing: error)
            return
          }

          guard let userToken, !userToken.isEmpty else {
            continuation.resume(throwing: AppleMusicKitError.missingUserToken)
            return
          }

          continuation.resume(returning: userToken)
        }
      }
    }
  }

  private static func serialize(_ status: MusicAuthorization.Status) -> String {
    switch status {
    case .authorized:
      return "authorized"
    case .denied:
      return "denied"
    case .restricted:
      return "restricted"
    case .notDetermined:
      return "notDetermined"
    @unknown default:
      return "notDetermined"
    }
  }
}

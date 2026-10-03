import Foundation
import AVFoundation

guard CommandLine.arguments.count >= 4 else {
    print("Usage: mux_video_narration <inputVideoMp4> <audioConfigJson> <outputMp4>")
    exit(1)
}

let videoURL = URL(fileURLWithPath: CommandLine.arguments[1])
let jsonURL = URL(fileURLWithPath: CommandLine.arguments[2])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[3])

try? FileManager.default.removeItem(at: outputURL)

struct AudioCue: Decodable {
    let time: Double
    let file: String
}

guard let jsonData = try? Data(contentsOf: jsonURL),
      let cues = try? JSONDecoder().decode([AudioCue].self, from: jsonData) else {
    print("Failed to parse audio cues JSON")
    exit(1)
}

let composition = AVMutableComposition()
let videoAsset = AVURLAsset(url: videoURL)
let videoDuration = videoAsset.duration

guard let compVideoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
      let sourceVideoTrack = videoAsset.tracks(withMediaType: .video).first else {
    print("Failed to add video track")
    exit(1)
}

try compVideoTrack.insertTimeRange(CMTimeRange(start: .zero, duration: videoDuration), of: sourceVideoTrack, at: .zero)

if let compAudioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
    for cue in cues {
        let clipURL = URL(fileURLWithPath: cue.file)
        let clipAsset = AVURLAsset(url: clipURL)
        if let clipTrack = clipAsset.tracks(withMediaType: .audio).first {
            let startTime = CMTime(seconds: cue.time, preferredTimescale: 600)
            let clipDur = clipAsset.duration
            // Ensure audio doesn't extend beyond total video duration
            let maxAvailable = CMTimeSubtract(videoDuration, startTime)
            let insertDur = CMTimeCompare(clipDur, maxAvailable) < 0 ? clipDur : maxAvailable
            if CMTimeGetSeconds(insertDur) > 0 {
                try? compAudioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: insertDur), of: clipTrack, at: startTime)
                print("Added voice cue at \(cue.time)s: \(cue.file)")
            }
        }
    }
}

guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
    print("Failed to create export session")
    exit(1)
}

exporter.outputURL = outputURL
exporter.outputFileType = .mp4

let group = DispatchGroup()
group.enter()
exporter.exportAsynchronously {
    group.leave()
}
group.wait()

if exporter.status == .completed {
    print("SUCCESS: Final narrated video created at: \(outputURL.path)")
} else {
    print("ERROR: Export failed: \(String(describing: exporter.error))")
    exit(1)
}

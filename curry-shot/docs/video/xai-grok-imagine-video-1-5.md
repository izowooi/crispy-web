## Basic model info

Model name: xai/grok-imagine-video-1.5
Model description: Image-to-video with synchronized audio using xAI's Grok Imagine Video 1.5 preview model


## Model inputs

- prompt (required): Text prompt describing the motion or scene for the generated video. (string)
- image (required): Input image to animate (image-to-video). Supports jpg, jpeg, png, webp. The output aspect ratio defaults to the image's native aspect ratio. (string)
- duration (optional): Duration of the video in seconds. (integer)
- aspect_ratio (optional): Aspect ratio of the output video. Defaults to the input image's native aspect ratio when 'auto' is selected. (string)
- resolution (optional): Resolution of the video. (string)


## Model output schema

{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/9mk1zz7zz1rmr0cygc992hfnjw)

#### Input

```json
{
  "image": "https://replicate.delivery/pbxt/PCRhFZ9wvsy2oylrpkZqa9VyAhDfe7VQi0jOKERQF6tX2ddF/download-4.png",
  "prompt": "Cinematic motion - the woman looks up out into the sunlight filtering into the room. ",
  "duration": 5,
  "resolution": "720p",
  "aspect_ratio": "auto"
}
```

#### Output

```json
"https://replicate.delivery/xezq/cBByL2g8a8YsMlnC3PtjRZrveiDH3Xe6iOoIWYTdzhXhekVtA/tmp1s0k1idu.mp4"
```


## Model readme

> # Grok Imagine Video 1.5 (preview)
>
> Animate still images into short videos with synchronized audio using xAI's Grok Imagine Video 1.5 preview model.
>
> Grok Imagine Video 1.5 takes a static image and brings it to life with realistic motion, object interactions, and automatically generated sound. Upload a portrait, a product photo, or any illustration, and watch it transform into a video complete with background music, sound effects, and ambient audio that matches the visual content.
>
> This preview release is image-to-video only — every prediction needs an input image. For text-to-video, use [xai/grok-imagine-video](https://replicate.com/xai/grok-imagine-video).
>
> ## What it does
>
> This model animates still images into short videos with synchronized audio. It handles both the visual generation and audio synthesis in one pass, so you get videos with sound that actually fits what's happening on screen, no separate audio editing needed.
>
> The model understands different types of content and adapts accordingly. It can animate cartoon characters with exaggerated expressions, turn product photos into 360-degree showcases, or add natural motion to portraits while maintaining the original style and composition of your image.
>
> ## What you can make
>
> **Product showcases**: Transform static product photography into dynamic demonstrations. A watch photo becomes a luxury ad with an elegant wrist turn. A sneaker shot gets a 360-degree rotation with dramatic lighting.
>
> **Character animation**: Turn illustrated characters into smooth animations. The model understands cartoon physics and exaggerated motion, creating professional-quality animation that would typically require an entire animation team.
>
> **Portrait videos**: Animate professional headshots into video introductions with natural human motion. The model handles realistic facial expressions, head turns, and body language.
>
> **Creative projects**: Bring concept art to life, animate historical photos, or turn memes into short video clips with appropriate sound effects and music.
>
> ## Prompt guide
>
> The most reliable way to write prompts for image-to-video is to think like a director. The model already has the scene from your image, so focus your prompt on **motion, not description**.
>
> - **Don't re-describe what's in the image.** The model sees it. Tell it what should change — the action, the camera movement, the atmosphere.
> - **Don't contradict the image.** If there's a man in the photo, don't write "a woman dances." Match your prompt to what's actually there.
> - **Be specific about motion.** The model can't infer the degree of motion from a still image. "Car passing" is vague — "car racing past at high speed" gives the model something to work with.
> - **Mention prominent features** to anchor the subject: "the old man wearing glasses" or "the woman in the red jacket."
> - **Negative prompts don't work.** The model ignores them. Describe what you want instead.
>
> **Portrait animation:**
> ```
> The woman slowly turns her head to the right and smiles,
> soft breeze moving her hair, gentle camera push-in.
> ```
>
> **Product animation:**
> ```
> The sneaker rotates smoothly on the pedestal, camera orbiting
> at eye level, dramatic spotlight sweeping across the surface.
> ```
>
> ### Camera movements
>
> The model understands standard cinematic camera language:
>
> - **Pan left/right** — camera rotates horizontally to reveal a scene
> - **Tilt up/down** — camera rotates vertically for dramatic reveals
> - **Zoom in/out** — lens zooms closer or further
> - **Dolly in/out** — camera physically moves forward or backward (more cinematic than zoom)
> - **Tracking/follow shot** — camera follows a moving subject
> - **Orbit/surround** — camera circles around the subject
> - **Aerial/drone** — elevated bird's-eye perspective
> - **Handheld** — natural shake for documentary feel or urgency
> - **Slow push-in** — gradual forward movement to build tension
> - **Static/tripod** — no camera movement for stable, formal compositions
>
> ### Audio prompts
>
> The model generates audio natively alongside the video. Influence it by mentioning sound in your prompt:
>
> - **Background music:** "with upbeat electronic music" or "dramatic orchestral score"
> - **Sound effects:** "footsteps on gravel," "wind howling," "engine revving"
> - **Ambient audio:** "quiet café ambience," "forest sounds with birdsong"
> - **Short dialogue:** "a quiet whisper: 'We made it.'" or "urgent shout: 'Stop him!'"
>
> You can add an `AUDIO:` section at the end of your prompt for clarity:
>
> ```
> Close-up of hands pulling apart a warm cinnamon roll, steam rising,
> soft morning window light, slow camera push-in, cozy kitchen mood.
> AUDIO: soft room tone, faint kettle hiss, gentle pastry tear sound,
> a quiet satisfied whisper: 'Perfect.'
> ```
>
> ### Multiple actions
>
> The model handles multi-beat sequences well. List actions in order:
>
> ```
> The athlete crouches at the starting line, then explodes forward,
> legs alternating rapidly, arms pumping powerfully. After crossing
> the finish line, the crowd erupts in cheers. Follow-shot perspective.
> ```
>
> ### Intensity and adverbs
>
> The model responds to intensity modifiers. Without them, it fills in its own interpretation, which may be more subtle than you want. Exaggerate slightly to match your intent:
>
> - "car passing" → "car racing past at high speed"
> - "man roaring" → "man roaring wildly"
> - "wings flapping" → "wings flapping with massive amplitude"
>
> ### Common mistakes
>
> - **Re-describing the image.** The model already sees it. Focus on motion.
> - **Contradicting the source image.** Match your prompt to what's actually in the photo.
> - **Tag stacking** ("knight, castle, epic, 8K, cinematic"). Write a natural sentence with intent instead.
> - **Too many simultaneous actions.** Keep it to one subject, one action, one camera move.
> - **No camera direction.** Always specify a shot type and camera movement.
> - **Vague motion** ("the thing moves"). Use specific verbs with intensity modifiers.
> - **Using negative prompts.** They're ignored. Describe what you want instead.
>
> ### Tips for better results
>
> - **Keep it simple.** One main subject + one primary action + one camera move.
> - **Iterate in small steps.** Change one thing at a time — lighting, camera, action, or mood.
> - **Describe lighting and time of day.** "Morning window light," "golden hour," "overcast," "candlelight."
> - **Use specific verbs.** "Surges," "unfurls," "shatters," "drifts" create better motion than "moves" or "goes."
> - **Shorter clips are more stable.** 5–8 seconds is the sweet spot. 15-second clips work but are more likely to have artifacts.
> - **Match aspect ratio to your platform.** 16:9 for YouTube, 9:16 for Reels/TikTok, 1:1 for social media thumbnails.
>
> ## Technical details
>
> - **Mode**: Image-to-video only (every prediction requires an input image)
> - **Video duration**: 1–15 seconds
> - **Resolution**: 480p or 720p
> - **Aspect ratios**: auto (matches the input image), 16:9, 9:16, 1:1, 4:3, 3:4, 3:2, 2:3
> - **Audio**: Automatically generated and synchronized with video
> - **Status**: Preview release

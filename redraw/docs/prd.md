replicate api 를 이용해서 이미지를 변형하는 웹앱을 만드려고 합니다.
Next.js 와 tailwind 기술을 사용하기를 원합니다.
웹앱은 무엇보다 사용이 단순하고, 보안이 안전해야합니다.
절대 api key 를 프론트엔드에 노출하면 안됩니다.
배포는 cloudflare 로 배포합니다.
이미지를 하나 업로드하고, 한 번에 여러가지 종류의 베리에이션으로 그림을 여러 장을 동시에 만들수 있어야 합니다. 동시가 안 된다면 순차적으로 처리해주세요.
이때 한 번에 요청할 수 있는 이미지는 4장으로 제한합니다.
만일 사용자가 2개의 이미지 스타일만 요청했다면 2개만 출력하면 됩니다.
만든 이미지는 한 번에 다운로드 할 수 있습니다.
참조 이미지를 활성화 할 경우 이미지 스타일을 선택하지 않고, 오로지 참조 이미지에만 참조해주세요. 제가 알기로 replicate kontext pro 모델은 한 번에 8개를 참조할 수 있다고 알고 있습니다. 너무 큰 경우 적절하게 프론트엔드에서 줄여서 업로드 해주세요.
제가 리서치한 자료들을 모두 docs/ 폴더에 md 파일 형태로 있습니다. 이 문서도 적절하게 참고해주세요.
아래는 제가 api 문서를 가져온 내용입니다.

## Get Started
Set the REPLICATE_API_TOKEN environment variable

export REPLICATE_API_TOKEN=r8_fHw**********************************

Visibility

Copy
Learn more about authentication

Install Replicate’s Node.js client library

npm install replicate

Copy
Learn more about setup
Run black-forest-labs/flux-kontext-pro using Replicate’s API. Check out the model's schema for an overview of inputs and outputs.

import { writeFile } from "fs/promises";
import Replicate from "replicate";
const replicate = new Replicate();

const input = {
    prompt: "Make this a 90s cartoon",
    input_image: "https://replicate.delivery/pbxt/N55l5TWGh8mSlNzW8usReoaNhGbFwvLeZR3TX1NL4pd2Wtfv/replicate-prediction-f2d25rg6gnrma0cq257vdw2n4c.png",
    output_format: "jpg"
};

const output = await replicate.run("black-forest-labs/flux-kontext-pro", { input });

// To access the file URL:
console.log(output.url());
//=> "https://replicate.delivery/.../output.jpg"

// To write the file to disk:
await writeFile("output.jpg", output);
//=> output.jpg written to disk


## input scheme
{
  "type": "object",
  "title": "Input",
  "required": [
    "prompt"
  ],
  "properties": {
    "seed": {
      "type": "integer",
      "title": "Seed",
      "nullable": true,
      "description": "Random seed. Set for reproducible generation"
    },
    "prompt": {
      "type": "string",
      "title": "Prompt",
      "description": "Text description of what you want to generate, or the instruction on how to edit the given image."
    },
    "input_image": {
      "type": "string",
      "title": "Input Image",
      "format": "uri",
      "nullable": true,
      "description": "Image to use as reference. Must be jpeg, png, gif, or webp."
    },
    "aspect_ratio": {
      "enum": [
        "match_input_image",
        "1:1",
        "16:9",
        "9:16",
        "4:3",
        "3:4",
        "3:2",
        "2:3",
        "4:5",
        "5:4",
        "21:9",
        "9:21",
        "2:1",
        "1:2"
      ],
      "type": "string",
      "title": "aspect_ratio",
      "description": "Aspect ratio of the generated image. Use 'match_input_image' to match the aspect ratio of the input image.",
      "default": "match_input_image",
      "x-order": 2
    },
    "output_format": {
      "enum": [
        "jpg",
        "png"
      ],
      "type": "string",
      "title": "output_format",
      "description": "Output format for the generated image",
      "default": "png",
      "x-order": 5
    },
    "safety_tolerance": {
      "type": "integer",
      "title": "Safety Tolerance",
      "default": 2,
      "maximum": 6,
      "minimum": 0,
      "description": "Safety tolerance, 0 is most strict and 6 is most permissive. 2 is currently the maximum allowed when input images are used."
    },
    "prompt_upsampling": {
      "type": "boolean",
      "title": "Prompt Upsampling",
      "default": false,
      "description": "Automatic prompt improvement"
    }
  }
}

## output scheme
{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

## API References
Create a prediction

predictions.create
Headers
Prefer
string
Leave the request open and wait for the model to finish generating output. Set to wait=n where n is a number of seconds between 1 and 60.

See https://replicate.com/docs/topics/predictions/create-a-prediction#sync-mode for more information.

Show more
Cancel-After
string
The maximum time the prediction can run before it is automatically canceled. The lifetime is measured from when the prediction is created.

The duration can be specified as string with an optional unit suffix:

s for seconds (e.g., 30s, 90s)
m for minutes (e.g., 5m, 15m)
h for hours (e.g., 1h, 2h30m)
defaults to seconds if no unit suffix is provided (e.g. 30 is the same as 30s)
You can combine units for more precision (e.g., 1h30m45s).

The minimum allowed duration is 5 seconds.

Show more
Request body
input
object
Required
The model's input as a JSON object. The input schema depends on what model you are running. To see the available inputs, click the "API" tab on the model you are running or get the model version and look at its openapi_schema property. For example, stability-ai/sdxl takes prompt as an input.

Files should be passed as HTTP URLs or data URLs.

Use an HTTP URL when:

you have a large file > 256kb
you want to be able to use the file multiple times
you want your prediction metadata to be associable with your input files
Use a data URL when:

you have a small file <= 256kb
you don't want to upload and host the file somewhere
you don't need to use the file again (Replicate will not store it)
Show more
webhook
string
An HTTPS URL for receiving a webhook when the prediction has new output. The webhook will be a POST request where the request body is the same as the response body of the get prediction operation. If there are network problems, we will retry the webhook a few times, so make sure it can be safely called more than once. Replicate will not follow redirects when sending webhook requests to your service, so be sure to specify a URL that will resolve without redirecting.

Show more
webhook_events_filter
array
By default, we will send requests to your webhook URL whenever there are new outputs or the prediction has finished. You can change which events trigger webhook requests by specifying webhook_events_filter in the prediction request:

start: immediately on prediction start
output: each time a prediction generates an output (note that predictions can generate multiple outputs)
logs: each time log output is generated by a prediction
completed: when the prediction reaches a terminal state (succeeded/canceled/failed)
For example, if you only wanted requests to be sent at the start and end of the prediction, you would provide:

{
  "version": "5c7d5dc6dd8bf75c1acaa8565735e7986bc5b66206b55cca93cb72c9bf15ccaa",
  "input": {
    "text": "Alice"
  },
  "webhook": "https://example.com/my-webhook",
  "webhook_events_filter": ["start", "completed"]
}
Requests for event types output and logs will be sent at most once every 500ms. If you request start and completed webhooks, then they'll always be sent regardless of throttling.

Show more
Examples

Create
Create a prediction and get the output


Webhooks
Make a request
/predictions
import { writeFile } from "fs/promises";
import Replicate from "replicate";
const replicate = new Replicate();

const input = {
    prompt: "Make this a 90s cartoon",
    input_image: "https://replicate.delivery/pbxt/N55l5TWGh8mSlNzW8usReoaNhGbFwvLeZR3TX1NL4pd2Wtfv/replicate-prediction-f2d25rg6gnrma0cq257vdw2n4c.png",
    output_format: "jpg"
};

const output = await replicate.run("black-forest-labs/flux-kontext-pro", { input });

// To access the file URL:
console.log(output.url());
//=> "https://replicate.delivery/.../output.jpg"

// To write the file to disk:
await writeFile("output.jpg", output);
//=> output.jpg written to disk

Copy

Get a prediction

predictions.get
Input parameters
prediction_id
string
Required
The ID of the prediction to get.
Examples

Get
Get the latest version of a prediction by id

Make a request
/predictions/{prediction_id}
import Replicate from "replicate";
const replicate = new Replicate();

console.log("Getting prediction...")
const prediction = await replicate.predictions.get(predictionId);
//=> {"id": "xyz...", "status": "successful", ... }

Copy

Cancel a prediction

predictions.cancel
Input parameters
prediction_id
string
Required
The ID of the prediction to cancel.
Examples

Cancel
Cancel an in progress prediction

Make a request
/predictions/{prediction_id}/cancel
import Replicate from "replicate";
const replicate = new Replicate();

console.log("Canceling prediction...")
const prediction = await replicate.predictions.cancel(predictionId);
//=> {"id": "xyz...", "status": "canceled", ... }

Copy

List predictions

predictions.list
Examples

List
List the first page of your predictions


Paginate
Make a request
/predictions
import Replicate from "replicate";
const replicate = new Replicate();

const page = await replicate.predictions.list();
console.log(page.results)
//=> [{ "id": "xyz...", "status": "successful", ... }, { ... }]
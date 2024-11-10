import { createRunner, PuppeteerRunnerExtension, Step, UserFlow } from '@puppeteer/replay';
import puppeteer from 'puppeteer';
import { ArgumentParser } from 'argparse';
import fs from 'fs';
import path from 'path';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import { version } from '../package.json';

const run = async (inputPath: string, outputDirPath: string, sleepTime: number, headful: boolean) => {
    const runRecording = async (flow: UserFlow, outputPath: string) => {
        const browser = await puppeteer.launch({
            headless: !headful,
        });

        const page = await browser.newPage();

        const recorder = new PuppeteerScreenRecorder(page);
        await recorder.start(outputPath);

        class Extension extends PuppeteerRunnerExtension {
            async afterEachStep(step: Step, _flow?: UserFlow) {
                if (step.type !== 'setViewport') {
                    await this.sleep(sleepTime);
                }
            }

            private async sleep(ms: number) {
                return new Promise((resolve) => setTimeout(resolve, ms));
            }
        }

        const runner = await createRunner(flow, new Extension(browser, page));

        await runner.run();

        await browser.close();
    };

    const getUserFlow = (path: string) => {
        const data = fs.readFileSync(path);
        return JSON.parse(data.toString());
    };

    const replaceExtension = (fileName: string) => {
        return fileName.replace('.json', '.mp4');
    };

    if (fs.statSync(inputPath).isDirectory()) {
        for (const file of fs.readdirSync(inputPath)) {
            if (!file.endsWith('.json')) {
                continue;
            }
            const filePath = path.join(inputPath, file);
            const userFlow = getUserFlow(filePath);
            const outputFilePath = path.join(outputDirPath, replaceExtension(file));
            await runRecording(userFlow, outputFilePath);
        }
    } else {
        const userFlow = getUserFlow(inputPath);
        const outputFilePath = path.join(outputDirPath, replaceExtension(path.basename(inputPath)));
        await runRecording(userFlow, outputFilePath);
    }
};

(async () => {
    const parser = new ArgumentParser();

    parser.add_argument('-v', '--version', { action: 'version', version: version });

    parser.add_argument('input_path', { help: 'path to the recording file or directory' });
    parser.add_argument('--output_dir_path', { default: './videos', help: 'path to the output directory' });
    parser.add_argument('--sleep_time', { type: 'int', default: 3000, help: 'sleep time between steps' });
    parser.add_argument('--headful', { action: 'store_true', help: 'run in headful mode' });

    const args = parser.parse_args();

    await run(args.input_path, args.output_dir_path, args.sleep_time, args.headful);
})();
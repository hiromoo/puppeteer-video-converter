import { createRunner, PuppeteerRunnerExtension, Step, UserFlow } from '@puppeteer/replay';
import puppeteer from 'puppeteer';
import { ArgumentParser } from 'argparse';
import fs from 'fs';
import path from 'path';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import { version } from '../package.json';

const run = async (
    inputPath: string,
    ignoreNavigation: boolean,
    outputDirPath: string,
    sleepTime: number,
    preFlowSleepTime: number,
    headful: boolean,
    preFlowPath?: string,
) => {
    const runRecording = async (flow: UserFlow, outputPath: string) => {
        class Extension extends PuppeteerRunnerExtension {
            #recorder?: PuppeteerScreenRecorder;

            async beforeAllSteps(flow?: UserFlow) {
                if (preFlowPath) {
                    const preUserFlow = getUserFlow(preFlowPath);
                    for (const step of preUserFlow.steps) {
                        await this.runStep(step, flow);
                        await this.sleep(preFlowSleepTime);
                    }
                }
                await this.sleep(sleepTime);

                this.#recorder = new PuppeteerScreenRecorder(this.page);
                await this.#recorder.start(outputPath);

                await this.sleep(sleepTime);
            }

            async afterEachStep(step: Step, _flow?: UserFlow) {
                if (step.type !== 'setViewport') {
                    await this.sleep(sleepTime);
                }
            }

            async afterAllSteps(_flow?: UserFlow) {
                await this.#recorder!.stop();
            }

            private async sleep(ms: number) {
                return new Promise((resolve) => setTimeout(resolve, ms));
            }
        }

        const browser = await puppeteer.launch({
            headless: !headful,
        });

        const page = await browser.newPage();

        const runner = await createRunner(
            ignoreNavigation
                ? {
                    ...flow,
                    steps: flow.steps.filter((step) => step.type !== 'navigate')
                }
                : flow,
            new Extension(browser, page)
        );

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
    parser.add_argument('--pre_flow_path', { type: 'str', help: 'path to the pre-flow file' });
    parser.add_argument('--ignore_navigation', { action: 'store_true', help: 'ignore navigation steps in the input file' });
    parser.add_argument('--output_dir_path', { default: './videos', help: 'path to the output directory' });
    parser.add_argument('--sleep_time', { type: 'int', default: 3000, help: 'sleep time between steps' });
    parser.add_argument('--pre_flow_sleep_time', { type: 'int', default: 0, help: 'sleep time between pre-flow steps' });
    parser.add_argument('--headful', { action: 'store_true', help: 'run in headful mode' });

    const args = parser.parse_args();

    await run(
        args.input_path,
        args.ignore_navigation,
        args.output_dir_path,
        args.sleep_time,
        args.pre_flow_sleep_time,
        args.headful,
        args.pre_flow_path
    );
})();
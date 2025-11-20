import { AIProvider, InferenceConfig } from "@/ai";
import config from "../config";
import { info } from "@actions/core";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { VertexAI } from "@google-cloud/vertexai";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export class VertexAIProvider implements AIProvider {
  private modelName: string;
  private project: string;
  private location: string;

  constructor(modelName: string) {
    this.modelName = modelName;
    if (!config.gcpProjectId) {
      throw new Error("GCP_PROJECT_ID is not set");
    }
    if (!config.gcpLocation) {
      throw new Error("GCP_LOCATION is not set");
    }
    this.project = config.gcpProjectId;
    this.location = config.gcpLocation;

    // Setup GCP credentials if provided as JSON string
    this.setupCredentials();
  }

  private setupCredentials(): void {
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (credentialsJson) {
      try {
        // Validate JSON
        JSON.parse(credentialsJson);

        // Create a temporary file for credentials
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gcp-creds-"));
        const credPath = path.join(tmpDir, "credentials.json");

        fs.writeFileSync(credPath, credentialsJson);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;

        info(
          "GCP credentials configured from GOOGLE_APPLICATION_CREDENTIALS_JSON",
        );
      } catch (error) {
        throw new Error(`Failed to setup GCP credentials: ${error}`);
      }
    } else if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      info(
        "Warning: No GCP credentials found. Relying on default credentials.",
      );
    }
  }

  async runInference({
    prompt,
    temperature,
    system,
    schema,
  }: InferenceConfig): Promise<any> {
    const vertexAI = new VertexAI({
      project: this.project,
      location: this.location,
    });

    const generativeModel = vertexAI.getGenerativeModel({
      model: this.modelName,
    });

    const parser = StructuredOutputParser.fromZodSchema(schema);
    const systemPrompt = system
      ? `${system}\n\n${parser.getFormatInstructions()}`
      : parser.getFormatInstructions();

    const request = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: temperature || 0,
      },
    };

    const resp = await generativeModel.generateContent(request);

    if (!resp.response.candidates || resp.response.candidates.length === 0) {
      throw new Error("No candidates found in response");
    }

    const result = resp.response.candidates[0].content.parts[0].text;
    if (!result) {
      throw new Error("No text found in response");
    }

    if (process.env.DEBUG) {
      info(`usage: \n${JSON.stringify(resp.response.usageMetadata, null, 2)}`);
    }

    try {
      const parsedResult = await parser.parse(result);
      return schema.parse(parsedResult);
    } catch (error) {
      throw new Error(`Failed to parse or validate response: ${error}`);
    }
  }
}

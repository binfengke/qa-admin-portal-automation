import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import SwaggerParser from "@apidevtools/swagger-parser";

type ContractMethod = "get" | "post";

type ContractResponseArgs = {
  path: string;
  method: ContractMethod;
  status: number;
  body: unknown;
};

type LoadedContract = {
  ajv: Ajv;
  document: any;
  validators: Map<string, ReturnType<Ajv["compile"]>>;
};

let loadedContractPromise: Promise<LoadedContract> | null = null;

async function loadContract(): Promise<LoadedContract> {
  if (!loadedContractPromise) {
    loadedContractPromise = (async () => {
      const contractPath = path.resolve(
        __dirname,
        "../../../../../contracts/admin-api.openapi.yaml",
      );

      await SwaggerParser.validate(contractPath);
      const document = await SwaggerParser.dereference(contractPath);

      const ajv = new Ajv({
        allErrors: true,
        strict: false,
      });
      addFormats(ajv);

      return {
        ajv,
        document,
        validators: new Map(),
      };
    })();
  }

  return loadedContractPromise;
}

function getResponseSchema(document: any, endpointPath: string, method: ContractMethod, status: number) {
  const operation = document?.paths?.[endpointPath]?.[method];
  if (!operation) {
    throw new Error(`Contract operation not found: ${method.toUpperCase()} ${endpointPath}`);
  }

  const response = operation.responses?.[String(status)];
  if (!response) {
    throw new Error(
      `Contract response not found for ${method.toUpperCase()} ${endpointPath} ${status}`,
    );
  }

  const schema = response.content?.["application/json"]?.schema;
  if (!schema) {
    throw new Error(
      `Contract schema not found for ${method.toUpperCase()} ${endpointPath} ${status}`,
    );
  }

  return schema;
}

export async function expectContractResponse(args: ContractResponseArgs) {
  const { ajv, document, validators } = await loadContract();
  const validatorKey = `${args.method}:${args.path}:${args.status}`;

  let validator = validators.get(validatorKey);
  if (!validator) {
    validator = ajv.compile(getResponseSchema(document, args.path, args.method, args.status));
    validators.set(validatorKey, validator);
  }

  const valid = validator(args.body);
  if (!valid) {
    throw new Error(
      [
        `Contract validation failed for ${args.method.toUpperCase()} ${args.path} ${args.status}`,
        ajv.errorsText(validator.errors, { separator: "\n" }),
      ].join("\n"),
    );
  }
}

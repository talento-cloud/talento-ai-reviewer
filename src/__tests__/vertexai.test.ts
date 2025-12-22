import { VertexAIProvider } from "../providers/vertexai";

describe("VertexAIProvider", () => {
  describe("cleanResponse", () => {
    let provider: any;

    beforeEach(() => {
      // Set required env vars
      process.env.GCP_PROJECT_ID = "test-project";
      process.env.GCP_LOCATION = "us-central1";
      
      provider = new VertexAIProvider("gemini-2.5-flash");
    });

    afterEach(() => {
      delete process.env.GCP_PROJECT_ID;
      delete process.env.GCP_LOCATION;
    });

    test("removes markdown code blocks from JSON string values", () => {
      const input = `***
  {
  "response_comment": "@isfon Gracias por la verificación tan detallada y por la aclaración. Tienes toda la razón. Mis disculpas por la confusión.

He revisado la estructura de directorios que has proporcionado y tu análisis es completamente correcto:
- \`src/core/config/i18n.js\`
- \`src/store/languageStore.js\`

Para ir de \`i18n.js\` a \`languageStore.js\`:
1. \`../\` sube de \`config/\` a \`core/\`
2. \`../\` sube de \`core/\` a \`src/\`
3. \`store/languageStore\` accede al archivo dentro de \`src/store/\`

Por lo tanto, la ruta \`../../store/languageStore\` es, de hecho, la correcta.

Por favor, revierte el cambio en la línea 3 para que quede como estaba originalmente:javascript
import useLanguageStore from \"../../store/languageStore\";

Aprecio mucho tu diligencia al verificar y corregir mi sugerencia. ¡Excelente trabajo!",
  "action_requested": true
}
***`;

      const result = provider.cleanResponse(input);
      
      // Should be valid JSON
      expect(() => JSON.parse(result)).not.toThrow();
      
      const parsed = JSON.parse(result);
      expect(parsed.response_comment).toContain("import useLanguageStore");
      expect(parsed.response_comment).not.toContain("```javascript");
      expect(parsed.action_requested).toBe(true);
    });

    test("removes top-level markdown code blocks", () => {
      const input = `\`\`\`json
{
  "title": "Test",
  "description": "A test description"
}
\`\`\``;

      const result = provider.cleanResponse(input);
      
      expect(() => JSON.parse(result)).not.toThrow();
      const parsed = JSON.parse(result);
      expect(parsed.title).toBe("Test");
    });

    test("removes separator lines", () => {
      const input = `***
{
  "title": "Test"
}
***`;

      const result = provider.cleanResponse(input);
      
      expect(() => JSON.parse(result)).not.toThrow();
      const parsed = JSON.parse(result);
      expect(parsed.title).toBe("Test");
    });

    test("extracts JSON from text with surrounding noise", () => {
      const input = `Some random text before
{
  "title": "Test"
}
Some random text after`;

      const result = provider.cleanResponse(input);
      
      expect(() => JSON.parse(result)).not.toThrow();
      const parsed = JSON.parse(result);
      expect(parsed.title).toBe("Test");
    });

    test("handles code blocks with language specifiers", () => {
      const input = `{
  "content": "Here is some code: \`\`\`typescript
const x = 1;
\`\`\`"
}`;

      const result = provider.cleanResponse(input);
      
      expect(() => JSON.parse(result)).not.toThrow();
      const parsed = JSON.parse(result);
      expect(parsed.content).toContain("const x = 1;");
      expect(parsed.content).not.toContain("```typescript");
    });
  });
});

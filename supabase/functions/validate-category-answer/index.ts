type ValidationStatus =
  | "valid"
  | "invalid"
  | "unknown";

type ValidationSource =
  | "local"
  | "wikidata"
  | "geodata"
  | "fallback";

type ValidationResponse = {
  status: ValidationStatus;
  source: ValidationSource;
  normalizedAnswer: string;
  reason: string;
};

type ValidationRequest = {
  category?: string;
  letter?: string;
  answer?: string;
  language?: "en" | "de";
};

const countries = new Set([
  "afghanistan",
  "albania",
  "algeria",
  "andorra",
  "angola",
  "argentina",
  "australia",
  "austria",
  "belgium",
  "brazil",
  "canada",
  "chile",
  "china",
  "croatia",
  "denmark",
  "egypt",
  "estonia",
  "finland",
  "france",
  "germany",
  "greece",
  "hungary",
  "iceland",
  "india",
  "indonesia",
  "ireland",
  "italy",
  "japan",
  "kenya",
  "latvia",
  "lithuania",
  "luxembourg",
  "mexico",
  "morocco",
  "netherlands",
  "new zealand",
  "nigeria",
  "norway",
  "peru",
  "poland",
  "portugal",
  "romania",
  "serbia",
  "slovakia",
  "slovenia",
  "south africa",
  "spain",
  "sweden",
  "switzerland",
  "thailand",
  "tunisia",
  "turkey",
  "ukraine",
  "united kingdom",
  "united states",
  "vietnam",
]);

function normalize(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function lower(value: string) {
  return normalize(value).toLocaleLowerCase();
}

function jsonResponse(
  payload: ValidationResponse,
  status = 200,
) {
  return new Response(
    JSON.stringify(payload),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    },
  );
}

async function validateCity(
  answer: string,
): Promise<ValidationResponse> {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?format=jsonv2` +
    `&limit=5` +
    `&addressdetails=1` +
    `&q=${encodeURIComponent(answer)}`;

  try {
    const result = await fetch(url, {
      headers: {
        "User-Agent":
          "GameNight/0.1 category-validator",
        "Accept-Language": "en",
      },
    });

    if (!result.ok) {
      return {
        status: "unknown",
        source: "geodata",
        normalizedAnswer: answer,
        reason:
          "Geographic lookup unavailable.",
      };
    }

    const data = await result.json();

    if (!Array.isArray(data)) {
      return {
        status: "unknown",
        source: "geodata",
        normalizedAnswer: answer,
        reason:
          "Unexpected geographic result.",
      };
    }

    const match = data.find(
      (item: {
        type?: string;
        addresstype?: string;
        category?: string;
      }) => {
        const type =
          item.addresstype ??
          item.type ??
          "";

        return [
          "city",
          "town",
          "village",
          "municipality",
        ].includes(type);
      },
    );

    if (match) {
      return {
        status: "valid",
        source: "geodata",
        normalizedAnswer: answer,
        reason:
          "Matched a populated place.",
      };
    }

    if (data.length === 0) {
      return {
        status: "invalid",
        source: "geodata",
        normalizedAnswer: answer,
        reason:
          "No matching place found.",
      };
    }

    return {
      status: "unknown",
      source: "geodata",
      normalizedAnswer: answer,
      reason:
        "Place exists, but could not confirm it as a city or town.",
    };
  } catch {
    return {
      status: "unknown",
      source: "geodata",
      normalizedAnswer: answer,
      reason:
        "Geographic lookup failed.",
    };
  }
}

type WikidataSearchResult = {
  id: string;
  label?: string;
  description?: string;
};

async function searchWikidata(
  answer: string,
  language: "en" | "de",
): Promise<WikidataSearchResult[]> {
  const url =
    "https://www.wikidata.org/w/api.php" +
    `?action=wbsearchentities` +
    `&search=${encodeURIComponent(answer)}` +
    `&language=${language}` +
    `&format=json` +
    `&limit=5` +
    `&origin=*`;

  try {
    const result = await fetch(url);

    if (!result.ok) {
      return [];
    }

    const data = await result.json();

    if (!Array.isArray(data.search)) {
      return [];
    }

    return data.search as WikidataSearchResult[];
  } catch {
    return [];
  }
}

function classifyWikidataResult(
  category: string,
  answer: string,
  results: WikidataSearchResult[],
): ValidationResponse {
  if (results.length === 0) {
    return {
      status: "unknown",
      source: "wikidata",
      normalizedAnswer: answer,
      reason:
        "No matching Wikidata entity found.",
    };
  }

  const descriptions =
    results
      .map(
        (result) =>
          `${result.label ?? ""} ${
            result.description ?? ""
          }`.toLocaleLowerCase(),
      )
      .join(" ");

  const keywordGroups: Record<
    string,
    string[]
  > = {
    animal: [
      "animal",
      "species",
      "mammal",
      "bird",
      "fish",
      "insect",
      "reptile",
      "amphibian",
      "taxon",
    ],

    river: [
      "river",
      "stream",
      "tributary",
      "watercourse",
    ],

    profession: [
      "profession",
      "occupation",
      "job",
      "worker",
      "specialist",
      "professional",
    ],

    name: [
      "given name",
      "first name",
      "masculine given name",
      "feminine given name",
      "unisex given name",
    ],
  };

  const keywords =
    keywordGroups[category] ?? [];

  const matched =
    keywords.some((keyword) =>
      descriptions.includes(keyword),
    );

  if (matched) {
    return {
      status: "valid",
      source: "wikidata",
      normalizedAnswer: answer,
      reason:
        `Matched ${category} information in Wikidata.`,
    };
  }

  return {
    status: "unknown",
    source: "wikidata",
    normalizedAnswer: answer,
    reason:
      "Entity exists, but its type could not be confirmed confidently.",
  };
}

async function validateWithWikidata(
  category: string,
  answer: string,
  language: "en" | "de",
) {
  const results =
    await searchWikidata(answer, language);

  return classifyWikidataResult(
    category,
    answer,
    results,
  );
}

async function handleRequest(
  request: Request,
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        status: "unknown",
        source: "fallback",
        normalizedAnswer: "",
        reason:
          "Only POST is supported.",
      },
      405,
    );
  }

  let body: ValidationRequest;

  try {
    body =
      await request.json();
  } catch {
    return jsonResponse(
      {
        status: "invalid",
        source: "fallback",
        normalizedAnswer: "",
        reason:
          "Invalid request body.",
      },
      400,
    );
  }

  const category =
    lower(body.category ?? "");

  const letter =
    lower(body.letter ?? "");

  const answer =
    normalize(body.answer ?? "");

  const language =
    body.language === "de"
      ? "de"
      : "en";

  if (
    !category ||
    !letter ||
    !answer
  ) {
    return jsonResponse(
      {
        status: "invalid",
        source: "fallback",
        normalizedAnswer: answer,
        reason:
          "Category, letter and answer are required.",
      },
      400,
    );
  }

  if (
    !lower(answer).startsWith(letter)
  ) {
    return jsonResponse({
      status: "invalid",
      source: "local",
      normalizedAnswer: answer,
      reason:
        `Answer must start with ${
          body.letter?.toUpperCase() ??
          letter.toUpperCase()
        }.`,
    });
  }

  if (category === "country") {
    const valid =
      countries.has(
        lower(answer),
      );

    return jsonResponse({
      status: valid
        ? "valid"
        : "invalid",
      source: "local",
      normalizedAnswer: answer,
      reason: valid
        ? "Matched a country."
        : "Unknown country.",
    });
  }

  if (category === "city") {
    return jsonResponse(
      await validateCity(answer),
    );
  }

  if (
    [
      "river",
      "animal",
      "profession",
      "name",
    ].includes(category)
  ) {
    return jsonResponse(
      await validateWithWikidata(
        category,
        answer,
        language
      ),
    );
  }

  return jsonResponse({
    status: "unknown",
    source: "fallback",
    normalizedAnswer: answer,
    reason:
      "No validator exists for this category yet.",
  });
}

export default {
  async fetch(
    request: Request,
  ): Promise<Response> {
    return handleRequest(request);
  },
};
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

/*
 * [English, German] name pairs. Covers the UN member
 * states (plus a handful of commonly-played non-UN
 * places like Vatican City / Taiwan) since this is a
 * party game validator, not a diplomatic authority.
 */
const countryPairs: [string, string][] = [
  ["afghanistan", "afghanistan"],
  ["albania", "albanien"],
  ["algeria", "algerien"],
  ["andorra", "andorra"],
  ["angola", "angola"],
  ["antigua and barbuda", "antigua und barbuda"],
  ["argentina", "argentinien"],
  ["armenia", "armenien"],
  ["australia", "australien"],
  ["austria", "österreich"],
  ["azerbaijan", "aserbaidschan"],
  ["bahamas", "bahamas"],
  ["bahrain", "bahrain"],
  ["bangladesh", "bangladesch"],
  ["barbados", "barbados"],
  ["belarus", "belarus"],
  ["belgium", "belgien"],
  ["belize", "belize"],
  ["benin", "benin"],
  ["bhutan", "bhutan"],
  ["bolivia", "bolivien"],
  ["bosnia and herzegovina", "bosnien und herzegowina"],
  ["botswana", "botswana"],
  ["brazil", "brasilien"],
  ["brunei", "brunei"],
  ["bulgaria", "bulgarien"],
  ["burkina faso", "burkina faso"],
  ["burundi", "burundi"],
  ["cambodia", "kambodscha"],
  ["cameroon", "kamerun"],
  ["canada", "kanada"],
  ["cape verde", "kap verde"],
  ["central african republic", "zentralafrikanische republik"],
  ["chad", "tschad"],
  ["chile", "chile"],
  ["china", "china"],
  ["colombia", "kolumbien"],
  ["comoros", "komoren"],
  ["congo", "kongo"],
  ["costa rica", "costa rica"],
  ["croatia", "kroatien"],
  ["cuba", "kuba"],
  ["cyprus", "zypern"],
  ["czech republic", "tschechien"],
  ["czechia", "tschechien"],
  ["denmark", "dänemark"],
  ["djibouti", "dschibuti"],
  ["dominica", "dominica"],
  ["dominican republic", "dominikanische republik"],
  ["ecuador", "ecuador"],
  ["egypt", "ägypten"],
  ["el salvador", "el salvador"],
  ["equatorial guinea", "äquatorialguinea"],
  ["eritrea", "eritrea"],
  ["estonia", "estland"],
  ["eswatini", "eswatini"],
  ["ethiopia", "äthiopien"],
  ["fiji", "fidschi"],
  ["finland", "finnland"],
  ["france", "frankreich"],
  ["gabon", "gabun"],
  ["gambia", "gambia"],
  ["georgia", "georgien"],
  ["germany", "deutschland"],
  ["ghana", "ghana"],
  ["greece", "griechenland"],
  ["grenada", "grenada"],
  ["guatemala", "guatemala"],
  ["guinea", "guinea"],
  ["guinea-bissau", "guinea-bissau"],
  ["guyana", "guyana"],
  ["haiti", "haiti"],
  ["honduras", "honduras"],
  ["hungary", "ungarn"],
  ["iceland", "island"],
  ["india", "indien"],
  ["indonesia", "indonesien"],
  ["iran", "iran"],
  ["iraq", "irak"],
  ["ireland", "irland"],
  ["israel", "israel"],
  ["italy", "italien"],
  ["ivory coast", "elfenbeinküste"],
  ["jamaica", "jamaika"],
  ["japan", "japan"],
  ["jordan", "jordanien"],
  ["kazakhstan", "kasachstan"],
  ["kenya", "kenia"],
  ["kiribati", "kiribati"],
  ["kosovo", "kosovo"],
  ["kuwait", "kuwait"],
  ["kyrgyzstan", "kirgisistan"],
  ["laos", "laos"],
  ["latvia", "lettland"],
  ["lebanon", "libanon"],
  ["lesotho", "lesotho"],
  ["liberia", "liberia"],
  ["libya", "libyen"],
  ["liechtenstein", "liechtenstein"],
  ["lithuania", "litauen"],
  ["luxembourg", "luxemburg"],
  ["madagascar", "madagaskar"],
  ["malawi", "malawi"],
  ["malaysia", "malaysia"],
  ["maldives", "malediven"],
  ["mali", "mali"],
  ["malta", "malta"],
  ["marshall islands", "marshallinseln"],
  ["mauritania", "mauretanien"],
  ["mauritius", "mauritius"],
  ["mexico", "mexiko"],
  ["micronesia", "mikronesien"],
  ["moldova", "moldau"],
  ["monaco", "monaco"],
  ["mongolia", "mongolei"],
  ["montenegro", "montenegro"],
  ["morocco", "marokko"],
  ["mozambique", "mosambik"],
  ["myanmar", "myanmar"],
  ["namibia", "namibia"],
  ["nauru", "nauru"],
  ["nepal", "nepal"],
  ["netherlands", "niederlande"],
  ["new zealand", "neuseeland"],
  ["nicaragua", "nicaragua"],
  ["niger", "niger"],
  ["nigeria", "nigeria"],
  ["north korea", "nordkorea"],
  ["north macedonia", "nordmazedonien"],
  ["norway", "norwegen"],
  ["oman", "oman"],
  ["pakistan", "pakistan"],
  ["palau", "palau"],
  ["palestine", "palästina"],
  ["panama", "panama"],
  ["papua new guinea", "papua-neuguinea"],
  ["paraguay", "paraguay"],
  ["peru", "peru"],
  ["philippines", "philippinen"],
  ["poland", "polen"],
  ["portugal", "portugal"],
  ["qatar", "katar"],
  ["romania", "rumänien"],
  ["russia", "russland"],
  ["rwanda", "ruanda"],
  ["saint kitts and nevis", "st. kitts und nevis"],
  ["saint lucia", "st. lucia"],
  ["saint vincent and the grenadines", "st. vincent und die grenadinen"],
  ["samoa", "samoa"],
  ["san marino", "san marino"],
  ["sao tome and principe", "são tomé und príncipe"],
  ["saudi arabia", "saudi-arabien"],
  ["senegal", "senegal"],
  ["serbia", "serbien"],
  ["seychelles", "seychellen"],
  ["sierra leone", "sierra leone"],
  ["singapore", "singapur"],
  ["slovakia", "slowakei"],
  ["slovenia", "slowenien"],
  ["solomon islands", "salomonen"],
  ["somalia", "somalia"],
  ["south africa", "südafrika"],
  ["south korea", "südkorea"],
  ["south sudan", "südsudan"],
  ["spain", "spanien"],
  ["sri lanka", "sri lanka"],
  ["sudan", "sudan"],
  ["suriname", "suriname"],
  ["sweden", "schweden"],
  ["switzerland", "schweiz"],
  ["syria", "syrien"],
  ["taiwan", "taiwan"],
  ["tajikistan", "tadschikistan"],
  ["tanzania", "tansania"],
  ["thailand", "thailand"],
  ["timor-leste", "timor-leste"],
  ["togo", "togo"],
  ["tonga", "tonga"],
  ["trinidad and tobago", "trinidad und tobago"],
  ["tunisia", "tunesien"],
  ["turkey", "türkei"],
  ["turkmenistan", "turkmenistan"],
  ["tuvalu", "tuvalu"],
  ["uganda", "uganda"],
  ["ukraine", "ukraine"],
  ["united arab emirates", "vereinigte arabische emirate"],
  ["united kingdom", "vereinigtes königreich"],
  ["united states", "vereinigte staaten"],
  ["uruguay", "uruguay"],
  ["uzbekistan", "usbekistan"],
  ["vanuatu", "vanuatu"],
  ["vatican city", "vatikanstadt"],
  ["venezuela", "venezuela"],
  ["vietnam", "vietnam"],
  ["yemen", "jemen"],
  ["zambia", "sambia"],
  ["zimbabwe", "simbabwe"],
];

/*
 * Accept either language's spelling regardless of the
 * room's game language: a player might reasonably type
 * the English name out of habit even in a German game
 * (and vice versa), and rejecting that would feel like a
 * bug, not a rule.
 */
const countries = new Set(
  countryPairs.flatMap(
    ([en, de]) => [en, de],
  ),
);

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
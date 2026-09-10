/*
 * Country data for the Atlas game.
 *
 * Flags are described declaratively rather than shipped as images, so
 * they can be rendered at any size, recoloured, and — for the "paint
 * the flag" round — handed to the player as empty regions to fill in.
 * That constrains the roster to flags whose geometry is a small number
 * of flat colour regions: plain stripe flags and Nordic crosses. A flag
 * with a coat of arms or an emblem cannot be drawn honestly this way,
 * so those countries are left out rather than approximated.
 */

export type FlagSpec =
  | {
      kind: "stripes";
      direction:
        | "horizontal"
        | "vertical";
      /** Band colours, drawn in order: top→bottom, or left→right. */
      bands: string[];
      /**
       * Relative band sizes. Omit for equal bands; Colombia's top
       * yellow band is half the flag, Thailand's blue band double the
       * others, and drawing those equal would simply be wrong.
       */
      weights?: number[];
    }
  | {
      /** Off-centre cross, shifted toward the hoist. */
      kind: "nordicCross";
      field: string;
      cross: string;
      /** Fimbriation: Norway and Iceland outline the cross. */
      border?: string;
    }
  | {
      /** Square flag, cross centred — Switzerland. */
      kind: "centeredCross";
      field: string;
      cross: string;
    };

export type AtlasCountry = {
  id: string;
  nameEn: string;
  nameDe: string;
  capitalEn: string;
  capitalDe: string;
  continent: Continent;
  /**
   * Absent when the real flag cannot be drawn honestly from flat
   * regions — an emblem, star or coat of arms. Those countries still
   * play a full part in the map and capital modes, which do not care
   * about the flag; only the flag modes filter them out.
   */
  flag?: FlagSpec;
};

export type Continent =
  | "europe"
  | "africa"
  | "asia"
  | "americas"
  | "oceania";

/*
 * The palette the paint round offers. Every colour used below must
 * appear here, or the flag using it would be unsolvable.
 */
export const FLAG_PALETTE: Record<
  string,
  string
> = {
  red: "#d52b1e",
  white: "#ffffff",
  blue: "#0039a6",
  lightBlue: "#4fa8dc",
  black: "#12100f",
  yellow: "#fcd116",
  green: "#00844a",
  orange: "#f26522",
};

export const PALETTE_KEYS =
  Object.keys(
    FLAG_PALETTE,
  ) as (keyof typeof FLAG_PALETTE)[];

const c = FLAG_PALETTE;

export const atlasCountries: AtlasCountry[] =
  [
    // --- Europe -------------------------------------------------
    {
      id: "de",
      nameEn: "Germany",
      nameDe: "Deutschland",
      capitalEn: "Berlin",
      capitalDe: "Berlin",
      continent: "europe",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.black,
          c.red,
          c.yellow,
        ],
      },
    },
    {
      id: "fr",
      nameEn: "France",
      nameDe: "Frankreich",
      capitalEn: "Paris",
      capitalDe: "Paris",
      continent: "europe",
      flag: {
        kind: "stripes",
        direction: "vertical",
        bands: [
          c.blue,
          c.white,
          c.red,
        ],
      },
    },
    {
      id: "it",
      nameEn: "Italy",
      nameDe: "Italien",
      capitalEn: "Rome",
      capitalDe: "Rom",
      continent: "europe",
      flag: {
        kind: "stripes",
        direction: "vertical",
        bands: [
          c.green,
          c.white,
          c.red,
        ],
      },
    },
    {
      id: "ie",
      nameEn: "Ireland",
      nameDe: "Irland",
      capitalEn: "Dublin",
      capitalDe: "Dublin",
      continent: "europe",
      flag: {
        kind: "stripes",
        direction: "vertical",
        bands: [
          c.green,
          c.white,
          c.orange,
        ],
      },
    },
    {
      id: "be",
      nameEn: "Belgium",
      nameDe: "Belgien",
      capitalEn: "Brussels",
      capitalDe: "Brüssel",
      continent: "europe",
      flag: {
        kind: "stripes",
        direction: "vertical",
        bands: [
          c.black,
          c.yellow,
          c.red,
        ],
      },
    },
    {
      id: "nl",
      nameEn: "Netherlands",
      nameDe: "Niederlande",
      capitalEn: "Amsterdam",
      capitalDe: "Amsterdam",
      continent: "europe",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.red,
          c.white,
          c.blue,
        ],
      },
    },
    {
      id: "ru",
      nameEn: "Russia",
      nameDe: "Russland",
      capitalEn: "Moscow",
      capitalDe: "Moskau",
      continent: "europe",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.white,
          c.blue,
          c.red,
        ],
      },
    },
    {
      id: "at",
      nameEn: "Austria",
      nameDe: "Österreich",
      capitalEn: "Vienna",
      capitalDe: "Wien",
      continent: "europe",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.red,
          c.white,
          c.red,
        ],
      },
    },
    {
      id: "pl",
      nameEn: "Poland",
      nameDe: "Polen",
      capitalEn: "Warsaw",
      capitalDe: "Warschau",
      continent: "europe",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [c.white, c.red],
      },
    },
    {
      id: "ua",
      nameEn: "Ukraine",
      nameDe: "Ukraine",
      capitalEn: "Kyiv",
      capitalDe: "Kyjiw",
      continent: "europe",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.lightBlue,
          c.yellow,
        ],
      },
    },
    {
      id: "hu",
      nameEn: "Hungary",
      nameDe: "Ungarn",
      capitalEn: "Budapest",
      capitalDe: "Budapest",
      continent: "europe",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.red,
          c.white,
          c.green,
        ],
      },
    },
    {
      id: "bg",
      nameEn: "Bulgaria",
      nameDe: "Bulgarien",
      capitalEn: "Sofia",
      capitalDe: "Sofia",
      continent: "europe",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.white,
          c.green,
          c.red,
        ],
      },
    },
    {
      id: "lt",
      nameEn: "Lithuania",
      nameDe: "Litauen",
      capitalEn: "Vilnius",
      capitalDe: "Vilnius",
      continent: "europe",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.yellow,
          c.green,
          c.red,
        ],
      },
    },
    {
      id: "ee",
      nameEn: "Estonia",
      nameDe: "Estland",
      capitalEn: "Tallinn",
      capitalDe: "Tallinn",
      continent: "europe",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.lightBlue,
          c.black,
          c.white,
        ],
      },
    },
    {
      id: "lu",
      nameEn: "Luxembourg",
      nameDe: "Luxemburg",
      capitalEn: "Luxembourg",
      capitalDe: "Luxemburg",
      continent: "europe",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.red,
          c.white,
          c.lightBlue,
        ],
      },
    },
    {
      id: "ro",
      nameEn: "Romania",
      nameDe: "Rumänien",
      capitalEn: "Bucharest",
      capitalDe: "Bukarest",
      continent: "europe",
      flag: {
        kind: "stripes",
        direction: "vertical",
        bands: [
          c.blue,
          c.yellow,
          c.red,
        ],
      },
    },
    {
      id: "dk",
      nameEn: "Denmark",
      nameDe: "Dänemark",
      capitalEn: "Copenhagen",
      capitalDe: "Kopenhagen",
      continent: "europe",
      flag: {
        kind: "nordicCross",
        field: c.red,
        cross: c.white,
      },
    },
    {
      id: "se",
      nameEn: "Sweden",
      nameDe: "Schweden",
      capitalEn: "Stockholm",
      capitalDe: "Stockholm",
      continent: "europe",
      flag: {
        kind: "nordicCross",
        field: c.blue,
        cross: c.yellow,
      },
    },
    {
      id: "fi",
      nameEn: "Finland",
      nameDe: "Finnland",
      capitalEn: "Helsinki",
      capitalDe: "Helsinki",
      continent: "europe",
      flag: {
        kind: "nordicCross",
        field: c.white,
        cross: c.blue,
      },
    },
    {
      id: "ch",
      nameEn: "Switzerland",
      nameDe: "Schweiz",
      capitalEn: "Bern",
      capitalDe: "Bern",
      continent: "europe",
      flag: {
        kind: "centeredCross",
        field: c.red,
        cross: c.white,
      },
    },
    {
      id: "no",
      nameEn: "Norway",
      nameDe: "Norwegen",
      capitalEn: "Oslo",
      capitalDe: "Oslo",
      continent: "europe",
      flag: {
        kind: "nordicCross",
        field: c.red,
        cross: c.blue,
        border: c.white,
      },
    },
    {
      id: "is",
      nameEn: "Iceland",
      nameDe: "Island",
      capitalEn: "Reykjavík",
      capitalDe: "Reykjavík",
      continent: "europe",
      flag: {
        kind: "nordicCross",
        field: c.blue,
        cross: c.red,
        border: c.white,
      },
    },

    // --- Africa -------------------------------------------------
    {
      id: "ng",
      nameEn: "Nigeria",
      nameDe: "Nigeria",
      capitalEn: "Abuja",
      capitalDe: "Abuja",
      continent: "africa",
      flag: {
        kind: "stripes",
        direction: "vertical",
        bands: [
          c.green,
          c.white,
          c.green,
        ],
      },
    },
    {
      id: "ml",
      nameEn: "Mali",
      nameDe: "Mali",
      capitalEn: "Bamako",
      capitalDe: "Bamako",
      continent: "africa",
      flag: {
        kind: "stripes",
        direction: "vertical",
        bands: [
          c.green,
          c.yellow,
          c.red,
        ],
      },
    },
    {
      id: "gn",
      nameEn: "Guinea",
      nameDe: "Guinea",
      capitalEn: "Conakry",
      capitalDe: "Conakry",
      continent: "africa",
      flag: {
        kind: "stripes",
        direction: "vertical",
        bands: [
          c.red,
          c.yellow,
          c.green,
        ],
      },
    },
    {
      id: "ga",
      nameEn: "Gabon",
      nameDe: "Gabun",
      capitalEn: "Libreville",
      capitalDe: "Libreville",
      continent: "africa",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.green,
          c.yellow,
          c.blue,
        ],
      },
    },
    {
      id: "sl",
      nameEn: "Sierra Leone",
      nameDe: "Sierra Leone",
      capitalEn: "Freetown",
      capitalDe: "Freetown",
      continent: "africa",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.green,
          c.white,
          c.lightBlue,
        ],
      },
    },
    {
      id: "bw",
      nameEn: "Botswana",
      nameDe: "Botsuana",
      capitalEn: "Gaborone",
      capitalDe: "Gaborone",
      continent: "africa",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.lightBlue,
          c.white,
          c.black,
          c.white,
          c.lightBlue,
        ],
        weights: [9, 1, 4, 1, 9],
      },
    },

    // --- Americas -----------------------------------------------
    {
      id: "co",
      nameEn: "Colombia",
      nameDe: "Kolumbien",
      capitalEn: "Bogotá",
      capitalDe: "Bogotá",
      continent: "americas",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.yellow,
          c.blue,
          c.red,
        ],
        weights: [2, 1, 1],
      },
    },
    {
      id: "pe",
      nameEn: "Peru",
      nameDe: "Peru",
      capitalEn: "Lima",
      capitalDe: "Lima",
      continent: "americas",
      flag: {
        kind: "stripes",
        direction: "vertical",
        bands: [
          c.red,
          c.white,
          c.red,
        ],
      },
    },
    {
      id: "bo",
      nameEn: "Bolivia",
      nameDe: "Bolivien",
      capitalEn: "Sucre",
      capitalDe: "Sucre",
      continent: "americas",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.red,
          c.yellow,
          c.green,
        ],
      },
    },

    // --- Asia ---------------------------------------------------
    {
      id: "id",
      nameEn: "Indonesia",
      nameDe: "Indonesien",
      capitalEn: "Jakarta",
      capitalDe: "Jakarta",
      continent: "asia",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [c.red, c.white],
      },
    },
    {
      id: "th",
      nameEn: "Thailand",
      nameDe: "Thailand",
      capitalEn: "Bangkok",
      capitalDe: "Bangkok",
      continent: "asia",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.red,
          c.white,
          c.blue,
          c.white,
          c.red,
        ],
        weights: [1, 1, 2, 1, 1],
      },
    },
    {
      id: "am",
      nameEn: "Armenia",
      nameDe: "Armenien",
      capitalEn: "Yerevan",
      capitalDe: "Eriwan",
      continent: "asia",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.red,
          c.blue,
          c.orange,
        ],
      },
    },
    {
      id: "ye",
      nameEn: "Yemen",
      nameDe: "Jemen",
      capitalEn: "Sanaa",
      capitalDe: "Sanaa",
      continent: "asia",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [
          c.red,
          c.white,
          c.black,
        ],
      },
    },
    {
      id: "lv",
      nameEn: "Latvia",
      nameDe: "Lettland",
      capitalEn: "Riga",
      capitalDe: "Riga",
      continent: "europe",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [c.red, c.white, c.red],
        weights: [2, 1, 2],
      },
    },
    /*
     * No flag on purpose: Monaco's red-over-white bicolour is Indonesia's,
     * differing only in aspect ratio, which this renderer does not express.
     * Monaco still plays in the capital rounds.
     */
    {
      id: "mc",
      nameEn: "Monaco",
      nameDe: "Monaco",
      capitalEn: "Monaco",
      capitalDe: "Monaco",
      continent: "europe",
    },
    {
      id: "ci",
      nameEn: "Côte d'Ivoire",
      nameDe: "Elfenbeinküste",
      capitalEn: "Yamoussoukro",
      capitalDe: "Yamoussoukro",
      continent: "africa",
      flag: {
        kind: "stripes",
        direction: "vertical",
        bands: [c.orange, c.white, c.green],
      },
    },
    /*
     * No flag on purpose: Chad's is a blue-yellow-red vertical tricolour,
     * which is Romania's exactly. Real life tells them apart by a shade of
     * blue this palette does not carry, so drawn here they are the same
     * picture and "pick the flag" would have two right answers. Chad still
     * plays in the capital and map rounds.
     */
    {
      id: "td",
      nameEn: "Chad",
      nameDe: "Tschad",
      capitalEn: "N'Djamena",
      capitalDe: "N'Djamena",
      continent: "africa",
    },
    {
      id: "gm",
      nameEn: "The Gambia",
      nameDe: "Gambia",
      capitalEn: "Banjul",
      capitalDe: "Banjul",
      continent: "africa",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [c.red, c.white, c.blue, c.white, c.green],
        weights: [6, 1, 4, 1, 6],
      },
    },
    {
      id: "mu",
      nameEn: "Mauritius",
      nameDe: "Mauritius",
      capitalEn: "Port Louis",
      capitalDe: "Port Louis",
      continent: "africa",
      flag: {
        kind: "stripes",
        direction: "horizontal",
        bands: [c.red, c.blue, c.yellow, c.green],
      },
    },

  ];

function mapCountry(
  id: string,
  nameEn: string,
  nameDe: string,
  capitalEn: string,
  capitalDe: string,
  continent: Continent,
): AtlasCountry {
  return {
    id,
    nameEn,
    nameDe,
    capitalEn,
    capitalDe,
    continent,
  };
}

/*
 * Countries carried for the map and capital modes only.
 *
 * Several are here precisely because their flag cannot be drawn from
 * flat colour regions (Spain's arms, Brazil's globe, China's stars), so
 * they were left out of the flag roster. None of that matters for a map
 * outline or a capital city, and without them the Americas had three
 * countries to choose from and Asia four — not enough for a region map
 * or a four-way choice.
 */
const mapOnlyCountries: AtlasCountry[] =
  [
    // --- Europe ---------------------------------------------------
    mapCountry("es", "Spain", "Spanien", "Madrid", "Madrid", "europe"),
    mapCountry("pt", "Portugal", "Portugal", "Lisbon", "Lissabon", "europe"),
    mapCountry("gr", "Greece", "Griechenland", "Athens", "Athen", "europe"),
    mapCountry("cz", "Czechia", "Tschechien", "Prague", "Prag", "europe"),
    mapCountry("gb", "United Kingdom", "Vereinigtes Königreich", "London", "London", "europe"),

    // --- Americas -------------------------------------------------
    mapCountry("us", "United States of America", "Vereinigte Staaten", "Washington, D.C.", "Washington, D.C.", "americas"),
    mapCountry("ca", "Canada", "Kanada", "Ottawa", "Ottawa", "americas"),
    mapCountry("mx", "Mexico", "Mexiko", "Mexico City", "Mexiko-Stadt", "americas"),
    mapCountry("br", "Brazil", "Brasilien", "Brasília", "Brasília", "americas"),
    mapCountry("ar", "Argentina", "Argentinien", "Buenos Aires", "Buenos Aires", "americas"),
    mapCountry("cl", "Chile", "Chile", "Santiago", "Santiago de Chile", "americas"),

    // --- Asia -----------------------------------------------------
    mapCountry("cn", "China", "China", "Beijing", "Peking", "asia"),
    mapCountry("jp", "Japan", "Japan", "Tokyo", "Tokio", "asia"),
    mapCountry("in", "India", "Indien", "New Delhi", "Neu-Delhi", "asia"),
    mapCountry("tr", "Turkey", "Türkei", "Ankara", "Ankara", "asia"),
    mapCountry("sa", "Saudi Arabia", "Saudi-Arabien", "Riyadh", "Riad", "asia"),
    mapCountry("vn", "Vietnam", "Vietnam", "Hanoi", "Hanoi", "asia"),
    mapCountry("kz", "Kazakhstan", "Kasachstan", "Astana", "Astana", "asia"),

    // --- Africa ---------------------------------------------------
    mapCountry("eg", "Egypt", "Ägypten", "Cairo", "Kairo", "africa"),
    mapCountry("ma", "Morocco", "Marokko", "Rabat", "Rabat", "africa"),
    mapCountry("ke", "Kenya", "Kenia", "Nairobi", "Nairobi", "africa"),
    mapCountry("et", "Ethiopia", "Äthiopien", "Addis Ababa", "Addis Abeba", "africa"),
    mapCountry("dz", "Algeria", "Algerien", "Algiers", "Algier", "africa"),
    /*
     * South Africa has three capitals; Pretoria is the seat of
     * government and the one a quiz means.
     */
    mapCountry("za", "South Africa", "Südafrika", "Pretoria", "Pretoria", "africa"),
    mapCountry("al", "Albania", "Albanien", "Tirana", "Tirana", "europe"),
    mapCountry("ad", "Andorra", "Andorra", "Andorra la Vella", "Andorra la Vella", "europe"),
    mapCountry("by", "Belarus", "Belarus", "Minsk", "Minsk", "europe"),
    mapCountry("ba", "Bosnia and Herzegovina", "Bosnien und Herzegowina", "Sarajevo", "Sarajevo", "europe"),
    mapCountry("hr", "Croatia", "Kroatien", "Zagreb", "Zagreb", "europe"),
    mapCountry("va", "Vatican City", "Vatikanstadt", "Vatican City", "Vatikanstadt", "europe"),
    mapCountry("li", "Liechtenstein", "Liechtenstein", "Vaduz", "Vaduz", "europe"),
    mapCountry("mt", "Malta", "Malta", "Valletta", "Valletta", "europe"),
    mapCountry("md", "Moldova", "Moldau", "Chișinău", "Chișinău", "europe"),
    mapCountry("me", "Montenegro", "Montenegro", "Podgorica", "Podgorica", "europe"),
    mapCountry("mk", "North Macedonia", "Nordmazedonien", "Skopje", "Skopje", "europe"),
    mapCountry("sm", "San Marino", "San Marino", "San Marino", "San Marino", "europe"),
    mapCountry("rs", "Serbia", "Serbien", "Belgrade", "Belgrad", "europe"),
    mapCountry("sk", "Slovakia", "Slowakei", "Bratislava", "Bratislava", "europe"),
    mapCountry("si", "Slovenia", "Slowenien", "Ljubljana", "Ljubljana", "europe"),
    mapCountry("ao", "Angola", "Angola", "Luanda", "Luanda", "africa"),
    mapCountry("bj", "Benin", "Benin", "Porto-Novo", "Porto-Novo", "africa"),
    mapCountry("bf", "Burkina Faso", "Burkina Faso", "Ouagadougou", "Ouagadougou", "africa"),
    mapCountry("bi", "Burundi", "Burundi", "Gitega", "Gitega", "africa"),
    mapCountry("cv", "Cabo Verde", "Kap Verde", "Praia", "Praia", "africa"),
    mapCountry("cm", "Cameroon", "Kamerun", "Yaoundé", "Jaunde", "africa"),
    mapCountry("cf", "Central African Republic", "Zentralafrikanische Republik", "Bangui", "Bangui", "africa"),
    mapCountry("km", "Comoros", "Komoren", "Moroni", "Moroni", "africa"),
    mapCountry("cg", "Republic of the Congo", "Republik Kongo", "Brazzaville", "Brazzaville", "africa"),
    mapCountry("cd", "Democratic Republic of the Congo", "Demokratische Republik Kongo", "Kinshasa", "Kinshasa", "africa"),
    mapCountry("dj", "Djibouti", "Dschibuti", "Djibouti", "Dschibuti", "africa"),
    mapCountry("gq", "Equatorial Guinea", "Äquatorialguinea", "Malabo", "Malabo", "africa"),
    mapCountry("er", "Eritrea", "Eritrea", "Asmara", "Asmara", "africa"),
    mapCountry("sz", "Eswatini", "Eswatini", "Mbabane", "Mbabane", "africa"),
    mapCountry("gh", "Ghana", "Ghana", "Accra", "Accra", "africa"),
    mapCountry("gw", "Guinea-Bissau", "Guinea-Bissau", "Bissau", "Bissau", "africa"),
    mapCountry("ls", "Lesotho", "Lesotho", "Maseru", "Maseru", "africa"),
    mapCountry("lr", "Liberia", "Liberia", "Monrovia", "Monrovia", "africa"),
    mapCountry("ly", "Libya", "Libyen", "Tripoli", "Tripolis", "africa"),
    mapCountry("mg", "Madagascar", "Madagaskar", "Antananarivo", "Antananarivo", "africa"),
    mapCountry("mw", "Malawi", "Malawi", "Lilongwe", "Lilongwe", "africa"),
    mapCountry("mr", "Mauritania", "Mauretanien", "Nouakchott", "Nouakchott", "africa"),
    mapCountry("mz", "Mozambique", "Mosambik", "Maputo", "Maputo", "africa"),
    mapCountry("na", "Namibia", "Namibia", "Windhoek", "Windhoek", "africa"),
    mapCountry("ne", "Niger", "Niger", "Niamey", "Niamey", "africa"),
    mapCountry("rw", "Rwanda", "Ruanda", "Kigali", "Kigali", "africa"),
    mapCountry("st", "São Tomé and Príncipe", "São Tomé und Príncipe", "São Tomé", "São Tomé", "africa"),
    mapCountry("sn", "Senegal", "Senegal", "Dakar", "Dakar", "africa"),
    mapCountry("sc", "Seychelles", "Seychellen", "Victoria", "Victoria", "africa"),
    mapCountry("so", "Somalia", "Somalia", "Mogadishu", "Mogadischu", "africa"),
    mapCountry("ss", "South Sudan", "Südsudan", "Juba", "Juba", "africa"),
    mapCountry("sd", "Sudan", "Sudan", "Khartoum", "Khartum", "africa"),
    mapCountry("tz", "Tanzania", "Tansania", "Dodoma", "Dodoma", "africa"),
    mapCountry("tg", "Togo", "Togo", "Lomé", "Lomé", "africa"),
    mapCountry("tn", "Tunisia", "Tunesien", "Tunis", "Tunis", "africa"),
    mapCountry("ug", "Uganda", "Uganda", "Kampala", "Kampala", "africa"),
    mapCountry("zm", "Zambia", "Sambia", "Lusaka", "Lusaka", "africa"),
    mapCountry("zw", "Zimbabwe", "Simbabwe", "Harare", "Harare", "africa"),
    mapCountry("ag", "Antigua and Barbuda", "Antigua und Barbuda", "Saint John's", "Saint John's", "americas"),
    mapCountry("bs", "The Bahamas", "Bahamas", "Nassau", "Nassau", "americas"),
    mapCountry("bb", "Barbados", "Barbados", "Bridgetown", "Bridgetown", "americas"),
    mapCountry("bz", "Belize", "Belize", "Belmopan", "Belmopan", "americas"),
    mapCountry("cr", "Costa Rica", "Costa Rica", "San José", "San José", "americas"),
    mapCountry("cu", "Cuba", "Kuba", "Havana", "Havanna", "americas"),
    mapCountry("dm", "Dominica", "Dominica", "Roseau", "Roseau", "americas"),
    mapCountry("do", "Dominican Republic", "Dominikanische Republik", "Santo Domingo", "Santo Domingo", "americas"),
    mapCountry("ec", "Ecuador", "Ecuador", "Quito", "Quito", "americas"),
    mapCountry("sv", "El Salvador", "El Salvador", "San Salvador", "San Salvador", "americas"),
    mapCountry("gd", "Grenada", "Grenada", "Saint George's", "Saint George's", "americas"),
    mapCountry("gt", "Guatemala", "Guatemala", "Guatemala City", "Guatemala-Stadt", "americas"),
    mapCountry("gy", "Guyana", "Guyana", "Georgetown", "Georgetown", "americas"),
    mapCountry("ht", "Haiti", "Haiti", "Port-au-Prince", "Port-au-Prince", "americas"),
    mapCountry("hn", "Honduras", "Honduras", "Tegucigalpa", "Tegucigalpa", "americas"),
    mapCountry("jm", "Jamaica", "Jamaika", "Kingston", "Kingston", "americas"),
    mapCountry("ni", "Nicaragua", "Nicaragua", "Managua", "Managua", "americas"),
    mapCountry("pa", "Panama", "Panama", "Panama City", "Panama-Stadt", "americas"),
    mapCountry("py", "Paraguay", "Paraguay", "Asunción", "Asunción", "americas"),
    mapCountry("kn", "Saint Kitts and Nevis", "St. Kitts und Nevis", "Basseterre", "Basseterre", "americas"),
    mapCountry("lc", "Saint Lucia", "St. Lucia", "Castries", "Castries", "americas"),
    mapCountry("vc", "Saint Vincent and the Grenadines", "St. Vincent und die Grenadinen", "Kingstown", "Kingstown", "americas"),
    mapCountry("sr", "Suriname", "Suriname", "Paramaribo", "Paramaribo", "americas"),
    mapCountry("tt", "Trinidad and Tobago", "Trinidad und Tobago", "Port of Spain", "Port of Spain", "americas"),
    mapCountry("uy", "Uruguay", "Uruguay", "Montevideo", "Montevideo", "americas"),
    mapCountry("ve", "Venezuela", "Venezuela", "Caracas", "Caracas", "americas"),
    mapCountry("af", "Afghanistan", "Afghanistan", "Kabul", "Kabul", "asia"),
    mapCountry("az", "Azerbaijan", "Aserbaidschan", "Baku", "Baku", "asia"),
    mapCountry("bh", "Bahrain", "Bahrain", "Manama", "Manama", "asia"),
    mapCountry("bd", "Bangladesh", "Bangladesch", "Dhaka", "Dhaka", "asia"),
    mapCountry("bt", "Bhutan", "Bhutan", "Thimphu", "Thimphu", "asia"),
    mapCountry("bn", "Brunei", "Brunei", "Bandar Seri Begawan", "Bandar Seri Begawan", "asia"),
    mapCountry("kh", "Cambodia", "Kambodscha", "Phnom Penh", "Phnom Penh", "asia"),
    mapCountry("cy", "Cyprus", "Zypern", "Nicosia", "Nikosia", "asia"),
    mapCountry("ge", "Georgia", "Georgien", "Tbilisi", "Tiflis", "asia"),
    mapCountry("ir", "Iran", "Iran", "Tehran", "Teheran", "asia"),
    mapCountry("iq", "Iraq", "Irak", "Baghdad", "Bagdad", "asia"),
    mapCountry("il", "Israel", "Israel", "Jerusalem", "Jerusalem", "asia"),
    mapCountry("jo", "Jordan", "Jordanien", "Amman", "Amman", "asia"),
    mapCountry("kw", "Kuwait", "Kuwait", "Kuwait City", "Kuwait-Stadt", "asia"),
    mapCountry("kg", "Kyrgyzstan", "Kirgisistan", "Bishkek", "Bischkek", "asia"),
    mapCountry("la", "Laos", "Laos", "Vientiane", "Vientiane", "asia"),
    mapCountry("lb", "Lebanon", "Libanon", "Beirut", "Beirut", "asia"),
    mapCountry("my", "Malaysia", "Malaysia", "Kuala Lumpur", "Kuala Lumpur", "asia"),
    mapCountry("mv", "Maldives", "Malediven", "Malé", "Malé", "asia"),
    mapCountry("mn", "Mongolia", "Mongolei", "Ulaanbaatar", "Ulaanbaatar", "asia"),
    mapCountry("mm", "Myanmar", "Myanmar", "Naypyidaw", "Naypyidaw", "asia"),
    mapCountry("np", "Nepal", "Nepal", "Kathmandu", "Kathmandu", "asia"),
    mapCountry("kp", "North Korea", "Nordkorea", "Pyongyang", "Pjöngjang", "asia"),
    mapCountry("om", "Oman", "Oman", "Muscat", "Maskat", "asia"),
    mapCountry("pk", "Pakistan", "Pakistan", "Islamabad", "Islamabad", "asia"),
    mapCountry("ps", "Palestine", "Palästina", "Ramallah", "Ramallah", "asia"),
    mapCountry("ph", "Philippines", "Philippinen", "Manila", "Manila", "asia"),
    mapCountry("qa", "Qatar", "Katar", "Doha", "Doha", "asia"),
    mapCountry("sg", "Singapore", "Singapur", "Singapore", "Singapur", "asia"),
    mapCountry("kr", "South Korea", "Südkorea", "Seoul", "Seoul", "asia"),
    mapCountry("lk", "Sri Lanka", "Sri Lanka", "Sri Jayawardenepura Kotte", "Sri Jayawardenepura Kotte", "asia"),
    mapCountry("sy", "Syria", "Syrien", "Damascus", "Damaskus", "asia"),
    mapCountry("tj", "Tajikistan", "Tadschikistan", "Dushanbe", "Duschanbe", "asia"),
    mapCountry("tl", "Timor-Leste", "Timor-Leste", "Dili", "Dili", "asia"),
    mapCountry("tm", "Turkmenistan", "Turkmenistan", "Ashgabat", "Aschgabat", "asia"),
    mapCountry("ae", "United Arab Emirates", "Vereinigte Arabische Emirate", "Abu Dhabi", "Abu Dhabi", "asia"),
    mapCountry("uz", "Uzbekistan", "Usbekistan", "Tashkent", "Taschkent", "asia"),
    mapCountry("au", "Australia", "Australien", "Canberra", "Canberra", "oceania"),
    mapCountry("fj", "Fiji", "Fidschi", "Suva", "Suva", "oceania"),
    mapCountry("ki", "Kiribati", "Kiribati", "South Tarawa", "South Tarawa", "oceania"),
    mapCountry("mh", "Marshall Islands", "Marshallinseln", "Majuro", "Majuro", "oceania"),
    mapCountry("fm", "Micronesia", "Mikronesien", "Palikir", "Palikir", "oceania"),
    mapCountry("nr", "Nauru", "Nauru", "Yaren", "Yaren", "oceania"),
    mapCountry("nz", "New Zealand", "Neuseeland", "Wellington", "Wellington", "oceania"),
    mapCountry("pw", "Palau", "Palau", "Ngerulmud", "Ngerulmud", "oceania"),
    mapCountry("pg", "Papua New Guinea", "Papua-Neuguinea", "Port Moresby", "Port Moresby", "oceania"),
    mapCountry("ws", "Samoa", "Samoa", "Apia", "Apia", "oceania"),
    mapCountry("sb", "Solomon Islands", "Salomonen", "Honiara", "Honiara", "oceania"),
    mapCountry("to", "Tonga", "Tonga", "Nukuʻalofa", "Nukuʻalofa", "oceania"),
    mapCountry("tv", "Tuvalu", "Tuvalu", "Funafuti", "Funafuti", "oceania"),
    mapCountry("vu", "Vanuatu", "Vanuatu", "Port Vila", "Port Vila", "oceania"),
  ];

/** Every country, whether or not its flag can be drawn. */
export const allAtlasCountries: AtlasCountry[] =
  [
    ...atlasCountries,
    ...mapOnlyCountries,
  ];

/** Only those whose flag can be rendered — the flag modes use this. */
export const flagCountries: AtlasCountry[] =
  atlasCountries.filter(
    (country) => !!country.flag,
  );

export function getAtlasCountry(
  id: string,
): AtlasCountry | undefined {
  return allAtlasCountries.find(
    (country) =>
      country.id === id,
  );
}

export function countryName(
  country: AtlasCountry,
  language: "en" | "de",
): string {
  return language === "de"
    ? country.nameDe
    : country.nameEn;
}

export function capitalName(
  country: AtlasCountry,
  language: "en" | "de",
): string {
  return language === "de"
    ? country.capitalDe
    : country.capitalEn;
}


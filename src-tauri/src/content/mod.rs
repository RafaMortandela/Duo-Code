//! Carrega e valida as questões de `content/problems/<slug>/` (spec 002).

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Difficulty {
    Easy,
    Medium,
    Hard,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Comparator {
    #[default]
    Exact,
    Unordered,
    Float,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Param {
    pub name: String,
    #[serde(rename = "type")]
    pub ty: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Complexity {
    pub time: String,
    pub space: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TestCase {
    pub args: Vec<Value>,
    pub expected: Value,
    #[serde(default)]
    pub hidden: bool,
}

fn default_time_limit() -> u64 {
    2000
}

#[derive(Debug, Clone, Deserialize)]
struct Meta {
    id: String,
    title: String,
    difficulty: Difficulty,
    unit: String,
    #[serde(default)]
    tags: Vec<String>,
    entrypoint: String,
    params: Vec<Param>,
    returns: String,
    #[serde(default)]
    comparator: Comparator,
    #[serde(default = "default_time_limit")]
    time_limit_ms: u64,
    #[serde(default)]
    hints: Vec<String>,
    #[serde(default)]
    complexity: Option<Complexity>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Problem {
    pub slug: String,
    pub title: String,
    pub difficulty: Difficulty,
    pub unit: String,
    pub tags: Vec<String>,
    pub entrypoint: String,
    pub params: Vec<Param>,
    pub returns: String,
    pub comparator: Comparator,
    pub time_limit_ms: u64,
    pub hints: Vec<String>,
    pub complexity: Option<Complexity>,
    pub statement: String,
    pub starter: String,
    pub solution: String,
    pub tests: Vec<TestCase>,
}

/// Uma unidade da trilha, como em `content/units.json` (spec 004).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Unit {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub icon: String,
    /// Slugs, na ordem em que aparecem na unidade.
    pub problems: Vec<String>,
}

#[derive(Debug, Default)]
pub struct Loaded {
    pub problems: Vec<Problem>,
    /// Trilha, em ordem.
    pub units: Vec<Unit>,
    /// Questões ignoradas e o motivo (RF-1): vão para o log, não derrubam o app.
    pub warnings: Vec<String>,
}

pub const MAX_HINTS: usize = 3;

pub fn is_valid_type(ty: &str) -> bool {
    let ty = ty.trim();
    if let Some(inner) = ty.strip_prefix("list[").and_then(|r| r.strip_suffix(']')) {
        return is_valid_type(inner);
    }
    matches!(ty, "int" | "float" | "str" | "bool" | "ListNode" | "TreeNode")
}

fn is_identifier(s: &str) -> bool {
    let mut chars = s.chars();
    matches!(chars.next(), Some(c) if c.is_ascii_alphabetic() || c == '_')
        && chars.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

fn read(dir: &Path, name: &str) -> Result<String, String> {
    fs::read_to_string(dir.join(name)).map_err(|e| format!("{name}: {e}"))
}

/// Lê uma pasta de questão. O erro descreve o primeiro problema encontrado.
pub fn load_problem(dir: &Path) -> Result<Problem, String> {
    let slug = dir
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("invalid folder name")?
        .to_string();

    let meta: Meta =
        serde_json::from_str(&read(dir, "meta.json")?).map_err(|e| format!("meta.json: {e}"))?;
    let tests: Vec<TestCase> =
        serde_json::from_str(&read(dir, "tests.json")?).map_err(|e| format!("tests.json: {e}"))?;
    let statement = read(dir, "statement.md")?;
    let starter = read(dir, "starter.py")?;
    let solution = read(dir, "solution.py")?;

    if meta.id != slug {
        return Err(format!("meta.json: id '{}' must match the folder name", meta.id));
    }
    if meta.title.trim().is_empty() {
        return Err("meta.json: title is empty".into());
    }
    if meta.unit.trim().is_empty() {
        return Err("meta.json: unit is empty".into());
    }
    if !is_identifier(&meta.entrypoint) {
        return Err(format!(
            "meta.json: entrypoint '{}' is not a valid function name",
            meta.entrypoint
        ));
    }
    for p in &meta.params {
        if !is_identifier(&p.name) {
            return Err(format!("meta.json: invalid param name '{}'", p.name));
        }
        if !is_valid_type(&p.ty) {
            return Err(format!("meta.json: unknown type '{}' for param '{}'", p.ty, p.name));
        }
    }
    if !is_valid_type(&meta.returns) {
        return Err(format!("meta.json: unknown return type '{}'", meta.returns));
    }
    if meta.time_limit_ms == 0 {
        return Err("meta.json: time_limit_ms must be positive".into());
    }
    if meta.hints.len() > MAX_HINTS {
        return Err(format!("meta.json: at most {MAX_HINTS} hints"));
    }
    if statement.trim().is_empty() {
        return Err("statement.md is empty".into());
    }
    if !tests.iter().any(|t| !t.hidden) {
        return Err("tests.json: needs at least one visible test".into());
    }
    for (i, t) in tests.iter().enumerate() {
        if t.args.len() != meta.params.len() {
            return Err(format!(
                "tests.json: test {i} has {} args, expected {}",
                t.args.len(),
                meta.params.len()
            ));
        }
    }

    Ok(Problem {
        slug,
        title: meta.title,
        difficulty: meta.difficulty,
        unit: meta.unit,
        tags: meta.tags,
        entrypoint: meta.entrypoint,
        params: meta.params,
        returns: meta.returns,
        comparator: meta.comparator,
        time_limit_ms: meta.time_limit_ms,
        hints: meta.hints,
        complexity: meta.complexity,
        statement,
        starter,
        solution,
        tests,
    })
}

/// Carrega todas as questões de `<content_dir>/problems`, em ordem de slug.
pub fn load_all(content_dir: &Path) -> Loaded {
    let mut loaded = Loaded::default();
    let root = content_dir.join("problems");
    let entries = match fs::read_dir(&root) {
        Ok(e) => e,
        Err(e) => {
            loaded.warnings.push(format!("{}: {e}", root.display()));
            return loaded;
        }
    };
    let mut dirs: Vec<_> = entries
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| p.is_dir())
        .collect();
    dirs.sort();
    for dir in dirs {
        match load_problem(&dir) {
            Ok(p) => loaded.problems.push(p),
            Err(e) => loaded.warnings.push(format!("{}: {e}", dir.display())),
        }
    }
    let (units, warnings) = load_units(content_dir, &loaded.problems);
    loaded.units = units;
    loaded.warnings.extend(warnings);
    loaded
}

/// Unidades deduzidas do campo `unit` das questões, na ordem em que aparecem.
/// Usado quando não há `units.json` utilizável.
pub fn derive_units(problems: &[Problem]) -> Vec<Unit> {
    let mut units: Vec<Unit> = Vec::new();
    for p in problems {
        match units.iter_mut().find(|u| u.id == p.unit) {
            Some(u) => u.problems.push(p.slug.clone()),
            None => units.push(Unit {
                id: p.unit.clone(),
                title: p.unit.clone(),
                description: String::new(),
                icon: String::new(),
                problems: vec![p.slug.clone()],
            }),
        }
    }
    units
}

/// Lê `<content_dir>/units.json`. Referências que não existem, repetições e
/// unidades duplicadas são ignoradas com aviso (RF-7); nada disso derruba o app.
pub fn load_units(content_dir: &Path, problems: &[Problem]) -> (Vec<Unit>, Vec<String>) {
    let path = content_dir.join("units.json");
    let mut warnings = Vec::new();
    let parsed: Result<Vec<Unit>, String> = fs::read_to_string(&path)
        .map_err(|e| e.to_string())
        .and_then(|text| serde_json::from_str(&text).map_err(|e| e.to_string()));
    let raw = match parsed {
        Ok(units) => units,
        Err(e) => {
            warnings.push(format!("{}: {e}; units derived from the problems", path.display()));
            return (derive_units(problems), warnings);
        }
    };

    let known: std::collections::HashSet<&str> = problems.iter().map(|p| p.slug.as_str()).collect();
    let mut placed: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut units: Vec<Unit> = Vec::new();
    for mut unit in raw {
        if units.iter().any(|u| u.id == unit.id) {
            warnings.push(format!("units.json: duplicate unit '{}' ignored", unit.id));
            continue;
        }
        let id = unit.id.clone();
        unit.problems.retain(|slug| {
            if !known.contains(slug.as_str()) {
                warnings.push(format!("units.json: unit '{id}' references unknown problem '{slug}'"));
                false
            } else if !placed.insert(slug.clone()) {
                warnings.push(format!("units.json: problem '{slug}' appears more than once"));
                false
            } else {
                true
            }
        });
        units.push(unit);
    }
    for p in problems.iter().filter(|p| !placed.contains(&p.slug)) {
        warnings.push(format!("units.json: problem '{}' is not in any unit", p.slug));
    }
    (units, warnings)
}

#[cfg(test)]
pub mod testing {
    use super::*;
    use serde_json::json;

    /// Questão sintética para testes: soma de dois inteiros.
    pub fn add_problem() -> Problem {
        Problem {
            slug: "add".into(),
            title: "Add".into(),
            difficulty: Difficulty::Medium,
            unit: "warmup".into(),
            tags: vec![],
            entrypoint: "add".into(),
            params: vec![
                Param { name: "a".into(), ty: "int".into() },
                Param { name: "b".into(), ty: "int".into() },
            ],
            returns: "int".into(),
            comparator: Comparator::Exact,
            time_limit_ms: 1000,
            hints: vec!["first".into(), "second".into()],
            complexity: None,
            statement: "Add two numbers.".into(),
            starter: "def add(a, b):\n    pass\n".into(),
            solution: "def add(a, b):\n    return a + b\n".into(),
            tests: vec![
                TestCase { args: vec![json!(1), json!(2)], expected: json!(3), hidden: false },
                TestCase { args: vec![json!(-5), json!(5)], expected: json!(0), hidden: false },
                TestCase { args: vec![json!(40), json!(2)], expected: json!(42), hidden: true },
            ],
        }
    }

    pub fn write_problem(root: &Path, p: &Problem) -> std::path::PathBuf {
        let dir = root.join("problems").join(&p.slug);
        fs::create_dir_all(&dir).unwrap();
        let meta = json!({
            "id": p.slug, "title": p.title, "difficulty": p.difficulty, "unit": p.unit,
            "tags": p.tags, "entrypoint": p.entrypoint, "params": p.params,
            "returns": p.returns, "comparator": p.comparator,
            "time_limit_ms": p.time_limit_ms, "hints": p.hints,
        });
        fs::write(dir.join("meta.json"), meta.to_string()).unwrap();
        fs::write(dir.join("tests.json"), serde_json::to_string(&p.tests).unwrap()).unwrap();
        fs::write(dir.join("statement.md"), &p.statement).unwrap();
        fs::write(dir.join("starter.py"), &p.starter).unwrap();
        fs::write(dir.join("solution.py"), &p.solution).unwrap();
        dir
    }

    /// Escreve um `units.json` coerente com as questões dadas (uma unidade por `unit`).
    pub fn write_units_for(root: &Path, problems: &[Problem]) {
        let units = derive_units(problems);
        fs::write(root.join("units.json"), serde_json::to_string(&units).unwrap()).unwrap();
    }
}

#[cfg(test)]
mod tests {
    use super::testing::*;
    use super::*;

    #[test]
    fn loads_a_valid_problem() {
        let tmp = tempfile::tempdir().unwrap();
        let p = add_problem();
        write_problem(tmp.path(), &p);

        let loaded = load_all(tmp.path());

        // único aviso: não há units.json, então as unidades são deduzidas
        assert_eq!(loaded.warnings.len(), 1, "{:?}", loaded.warnings);
        assert_eq!(loaded.problems, vec![p]);
        assert_eq!(loaded.units.len(), 1);
    }

    // CA-11: pasta sem tests.json → a questão não aparece e o resto carrega.
    #[test]
    fn problem_without_tests_file_is_skipped() {
        let tmp = tempfile::tempdir().unwrap();
        let good = add_problem();
        write_problem(tmp.path(), &good);
        let mut broken = add_problem();
        broken.slug = "broken".into();
        let dir = write_problem(tmp.path(), &broken);
        fs::remove_file(dir.join("tests.json")).unwrap();

        let loaded = load_all(tmp.path());

        assert_eq!(loaded.problems.len(), 1);
        assert_eq!(loaded.problems[0].slug, "add");
        assert!(loaded.warnings.iter().any(|w| w.contains("tests.json")), "{:?}", loaded.warnings);
    }

    #[test]
    fn rejects_schema_problems() {
        let cases: Vec<(&str, Box<dyn Fn(&mut Problem)>)> = vec![
            ("unknown type", Box::new(|p| p.params[0].ty = "matrix".into())),
            ("unknown return type", Box::new(|p| p.returns = "set[int]".into())),
            ("entrypoint", Box::new(|p| p.entrypoint = "not valid".into())),
            ("visible test", Box::new(|p| p.tests.iter_mut().for_each(|t| t.hidden = true))),
            ("args", Box::new(|p| p.tests[0].args.pop().map(|_| ()).unwrap())),
            ("hints", Box::new(|p| p.hints = vec!["a".into(); 4])),
        ];
        for (expected, mutate) in cases {
            let tmp = tempfile::tempdir().unwrap();
            let mut p = add_problem();
            mutate(&mut p);
            let dir = write_problem(tmp.path(), &p);
            let err = load_problem(&dir).unwrap_err();
            assert!(err.contains(expected), "expected '{expected}' in '{err}'");
        }
    }

    #[test]
    fn folder_name_must_match_id() {
        let tmp = tempfile::tempdir().unwrap();
        let dir = write_problem(tmp.path(), &add_problem());
        let renamed = dir.with_file_name("other");
        fs::rename(&dir, &renamed).unwrap();
        assert!(load_problem(&renamed).unwrap_err().contains("folder name"));
    }

    #[test]
    fn missing_content_dir_is_a_warning_not_a_crash() {
        let tmp = tempfile::tempdir().unwrap();
        let loaded = load_all(&tmp.path().join("nope"));
        assert!(loaded.problems.is_empty());
        assert!(loaded.units.is_empty());
        assert!(!loaded.warnings.is_empty());
    }

    #[test]
    fn type_grammar() {
        for ok in ["int", "list[int]", "list[list[str]]", "ListNode", "list[ListNode]", "TreeNode"] {
            assert!(is_valid_type(ok), "{ok}");
        }
        for bad in ["", "list", "list[", "dict[str,int]", "listnode"] {
            assert!(!is_valid_type(bad), "{bad}");
        }
    }

    fn validator(content: &Path) -> std::process::Output {
        let script = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("scripts")
            .join("validate_content.py");
        std::process::Command::new(crate::runner::find_python().unwrap())
            .arg(script)
            .arg(content)
            .output()
            .unwrap()
    }

    // CA-12: o validador aprova conteúdo bom e falha se a solução de referência não passa.
    #[test]
    fn validator_script_passes_good_content_and_fails_broken_content() {
        let tmp = tempfile::tempdir().unwrap();
        write_problem(tmp.path(), &add_problem());
        write_units_for(tmp.path(), &[add_problem()]);
        let out = validator(tmp.path());
        assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stdout));

        let mut wrong = add_problem();
        wrong.slug = "wrong".into();
        wrong.solution = "def add(a, b):\n    return a - b\n".into();
        write_problem(tmp.path(), &wrong);
        write_units_for(tmp.path(), &[add_problem(), wrong.clone()]);
        let out = validator(tmp.path());
        assert_eq!(out.status.code(), Some(1));
        assert!(String::from_utf8_lossy(&out.stdout).contains("FAIL wrong"));
    }

    // 004 RF-7: o validador acusa trilha incoerente com as questões.
    #[test]
    fn validator_script_checks_the_units_file() {
        let tmp = tempfile::tempdir().unwrap();
        write_problem(tmp.path(), &add_problem());

        // sem units.json
        let out = validator(tmp.path());
        assert_eq!(out.status.code(), Some(1));
        assert!(String::from_utf8_lossy(&out.stdout).contains("units.json is missing"));

        // referência inexistente, questão órfã e unidade diferente da declarada
        fs::write(
            tmp.path().join("units.json"),
            serde_json::json!([
                {"id": "other", "title": "Other", "problems": ["ghost"]},
            ])
            .to_string(),
        )
        .unwrap();
        let out = validator(tmp.path());
        let text = String::from_utf8_lossy(&out.stdout).to_string();
        assert_eq!(out.status.code(), Some(1));
        assert!(text.contains("unknown problem 'ghost'"), "{text}");
        assert!(text.contains("'add' is not in any unit"), "{text}");

        fs::write(
            tmp.path().join("units.json"),
            serde_json::json!([{"id": "other", "title": "Other", "problems": ["add"]}]).to_string(),
        )
        .unwrap();
        let text = String::from_utf8_lossy(&validator(tmp.path()).stdout).to_string();
        assert!(text.contains("its meta.json says 'warmup'"), "{text}");
    }

    // Um starter que já resolve a questão também reprova.
    #[test]
    fn validator_script_rejects_a_starter_that_already_passes() {
        let tmp = tempfile::tempdir().unwrap();
        let mut p = add_problem();
        p.starter = p.solution.clone();
        write_problem(tmp.path(), &p);
        let out = validator(tmp.path());
        assert_eq!(out.status.code(), Some(1));
        assert!(String::from_utf8_lossy(&out.stdout).contains("starter.py"));
    }

    fn three() -> Vec<Problem> {
        ["p1", "p2", "p3"]
            .iter()
            .map(|slug| {
                let mut p = add_problem();
                p.slug = slug.to_string();
                p.unit = if *slug == "p3" { "second".into() } else { "first".into() };
                p
            })
            .collect()
    }

    fn write_units(root: &Path, json: serde_json::Value) {
        fs::create_dir_all(root).unwrap();
        fs::write(root.join("units.json"), json.to_string()).unwrap();
    }

    #[test]
    fn units_file_defines_order_and_metadata() {
        let tmp = tempfile::tempdir().unwrap();
        write_units(tmp.path(), serde_json::json!([
            {"id": "second", "title": "Second", "description": "d", "icon": "stack", "problems": ["p3"]},
            {"id": "first", "title": "First", "problems": ["p2", "p1"]},
        ]));
        let (units, warnings) = load_units(tmp.path(), &three());
        assert!(warnings.is_empty(), "{warnings:?}");
        assert_eq!(units.len(), 2);
        assert_eq!((units[0].id.as_str(), units[0].icon.as_str()), ("second", "stack"));
        assert_eq!(units[1].problems, vec!["p2", "p1"]);
    }

    // CA-8: acrescentar uma unidade ao arquivo a faz aparecer, sem mudar código.
    #[test]
    fn adding_a_unit_to_the_file_makes_it_appear() {
        let tmp = tempfile::tempdir().unwrap();
        write_units(tmp.path(), serde_json::json!([
            {"id": "first", "title": "First", "problems": ["p1", "p2"]},
            {"id": "second", "title": "Second", "problems": ["p3"]},
            {"id": "brand-new", "title": "Brand New", "problems": []},
        ]));
        let (units, warnings) = load_units(tmp.path(), &three());
        assert!(warnings.is_empty(), "{warnings:?}");
        assert_eq!(units.last().unwrap().title, "Brand New");
    }

    // RF-7
    #[test]
    fn bad_references_are_dropped_with_warnings() {
        let tmp = tempfile::tempdir().unwrap();
        write_units(tmp.path(), serde_json::json!([
            {"id": "first", "title": "First", "problems": ["p1", "ghost"]},
            {"id": "second", "title": "Second", "problems": ["p1", "p3"]},
            {"id": "first", "title": "Again", "problems": ["p2"]},
        ]));
        let (units, warnings) = load_units(tmp.path(), &three());
        assert_eq!(units.len(), 2);
        assert_eq!(units[0].problems, vec!["p1"]);
        assert_eq!(units[1].problems, vec!["p3"]);
        let all = warnings.join("\n");
        assert!(all.contains("unknown problem 'ghost'"), "{all}");
        assert!(all.contains("'p1' appears more than once"), "{all}");
        assert!(all.contains("duplicate unit 'first'"), "{all}");
        assert!(all.contains("'p2' is not in any unit"), "{all}");
    }

    #[test]
    fn without_a_units_file_units_come_from_the_problems() {
        let tmp = tempfile::tempdir().unwrap();
        let (units, warnings) = load_units(tmp.path(), &three());
        assert_eq!(warnings.len(), 1);
        assert_eq!(units.len(), 2);
        assert_eq!(units[0].id, "first");
        assert_eq!(units[0].problems, vec!["p1", "p2"]);
        assert_eq!(units[1].problems, vec!["p3"]);
    }

    // O conteúdo real do repositório precisa carregar sem nenhuma questão ignorada.
    #[test]
    fn repository_content_loads_cleanly() {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("..").join("content");
        let loaded = load_all(&dir);
        assert!(loaded.warnings.is_empty(), "{:#?}", loaded.warnings);
        assert!(!loaded.problems.is_empty());
        // 006 CA-2: 30 questões em 10 unidades de 3, sem repetição nem órfã
        assert_eq!(loaded.problems.len(), 30);
        assert_eq!(loaded.units.len(), 10);
        assert!(loaded.units.iter().all(|u| u.problems.len() == 3));
        let by = |d: Difficulty| loaded.problems.iter().filter(|p| p.difficulty == d).count();
        assert_eq!((by(Difficulty::Easy), by(Difficulty::Medium), by(Difficulty::Hard)), (11, 16, 3));
        // 006 RF-2, RF-5: testes e dicas suficientes em cada questão
        for p in &loaded.problems {
            let visible = p.tests.iter().filter(|t| !t.hidden).count();
            assert!(visible >= 3, "{}: {visible} visible tests", p.slug);
            assert!(p.tests.len() - visible >= 5, "{}: too few hidden tests", p.slug);
            assert!((1..=3).contains(&p.hints.len()), "{}: hints", p.slug);
            assert!(p.complexity.is_some(), "{}: complexity", p.slug);
        }
        // toda questão está em exatamente uma unidade, e na unidade que ela declara
        let placed: usize = loaded.units.iter().map(|u| u.problems.len()).sum();
        assert_eq!(placed, loaded.problems.len());
        for unit in &loaded.units {
            for slug in &unit.problems {
                let p = loaded.problems.iter().find(|p| &p.slug == slug).unwrap();
                assert_eq!(p.unit, unit.id, "{slug}");
            }
        }
    }
}

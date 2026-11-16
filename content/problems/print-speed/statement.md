A print shop has a queue of jobs; `jobs[i]` is the number of pages of job `i`. The printer has a speed dial: at speed `s` it prints up to `s` pages per hour.

Each hour the printer works on **one** job only. If a job finishes before the hour is over, the printer idles until the next hour starts.

Everything must be printed within `hours` hours. Return the **smallest** whole-number speed that makes it possible.

### Example 1

```
Input:  jobs = [30, 11, 23, 4], hours = 6
Output: 15
```

At speed 15 the jobs take `2 + 1 + 2 + 1 = 6` hours. At speed 14 they would take 7.

### Example 2

```
Input:  jobs = [10, 10, 10], hours = 3
Output: 10
```

### Example 3

```
Input:  jobs = [7], hours = 100
Output: 1
```

### Constraints

- `1 <= len(jobs) <= 10_000`
- `1 <= jobs[i] <= 1_000_000_000`
- `len(jobs) <= hours <= 1_000_000_000`

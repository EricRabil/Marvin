import { Course, GradebookEntry, GradeMapping } from "@bbdash/shared";
import Statsy from "@erics-world/statsy";
import { StatsyStream } from "@erics-world/statsy/dist/stream";
import { TextChannel } from "discord.js";
import { DCommandGroup, BaseDPlugin, DPlugin, DPluginLoaded, embed, field, title } from "discord-botkit";

function convertDisplayGrade(entry: GradebookEntry): number | null {
    if (!entry.displayGrade) return null;
    return (+entry.displayGrade / 100) * entry.pointsPossible;
}

function gradeForCourse(course: Course, grades: GradebookEntry[]): string | undefined {
    const gradePairs = grades.filter(m => m.status === "GRADED" || typeof m.manualGrade === "string").map(m => [parseFloat(([m.manualGrade || m.manualScore || convertDisplayGrade(m)] as unknown as string[]).find(g => typeof g !== "undefined" && g !== null) || ""), m.pointsPossible]).filter(([pts,pos]) => !isNaN(pts) && !isNaN(pos));

    const { actual, possible } = gradePairs.reduce(({ actual, possible }, [ earned, pointsPossible ]) => {
        return {
            actual: actual + earned,
            possible: possible + (typeof earned === "number" ? pointsPossible : 0)
        };
    }, { actual: 0, possible: 0 });

    const percentage = (actual / possible) * 100;

    if (isNaN(percentage)) return undefined;
    else return `${percentage.toFixed(2)}%`;
}

function includeCourse({ startDate, endDate, term }: Course): boolean {
    const now = new Date();
    if (term) return now > new Date(term.startDate) && now < new Date(term.endDate);
    else return now > new Date(startDate) && now < new Date(endDate); 
}

function displayGrades(courses: Course[], grades: GradeMapping) {
    return embed(
        title("Grades"),
        courses.filter(includeCourse).map(course => field(course.displayName || course.name, gradeForCourse(course, grades[course.id] || [])))
    );
}

@DPlugin("grades")
@DCommandGroup("grades")
export class Grades extends BaseDPlugin {
    statsy = new Statsy({
        host: process.env.STATSY_HOST || "https://statsy.ericrabil.com",
        gatewayHost: process.env.STATSY_GW_HOST || "wss://statsy.ericrabil.com",
        authorization: process.env.STATSY_TOKEN
    });

    oldGrades: Record<string, string | undefined>;

    stream: StatsyStream;

    @DPluginLoaded
    async loaded() {
        this.stream = this.statsy.stream("eric");

        await this.stream.open();

        await this.stream.subscribe("/grades/");

        this.stream.observe("/grades/", async (grades: GradeMapping) => await this.handleNewGrades(grades));

        await this.handleNewGrades(await this.grades());
    }

    async handleNewGrades(grades: GradeMapping) {
        const oldGrades = this.oldGrades || {};

        const gradesChannel: TextChannel = await this.client.channels.fetch("820684408457134081") as TextChannel;

        const courses = await this.courses();
        const newGrades = this.oldGrades = Object.fromEntries(Object.entries(grades).map(([ courseID, grades ]) => [ courseID, gradeForCourse(courses[courseID], grades) ]));

        const changedGradePairs: [string, string | undefined][] = Object.entries(newGrades).filter(([ courseID, average ]) => oldGrades[courseID] !== average);

        if (changedGradePairs.length === 0) return;

        gradesChannel.send({
            embed: embed(
                title("Grades"),
                changedGradePairs.map(([ courseID, average ]) => field(courses[courseID].displayName || courses[courseID].name, average))
            ),
            content: "<@163024083364216832>"
        });
    }

    private async grades(): Promise<GradeMapping> {
        return this.statsy.get("eric", "grades");
    }

    private async courses(): Promise<Record<string, Course>> {
        return this.statsy.get("eric", "courses");
    }
}
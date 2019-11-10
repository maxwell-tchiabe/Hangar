import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from 'typeorm';
import { JudgingVote } from './judgingVote';
import { Team } from './team';

@Entity()
export class Judge extends BaseEntity {
  constructor() {
    super();

    this.visitedTeams = [];
    this.currentTeam = null;
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column('simple-json')
  visitedTeams: number[];

  @Column({ nullable: true })
  currentTeam?: number;

  async getNextTeam(): Promise<Team> {
    const newTeam = await Team.getNextAvailableTeamExcludingTeams(this.visitedTeams);
    this.currentTeam = newTeam ? newTeam.id : null;
    await this.save();
    return newTeam;
  }

  getLastJudgedTeamId(): number {
    return this.visitedTeams[this.visitedTeams.length - 1];
  }

  async continue(): Promise<void> {
    await this.recordCurrentTeamAndSave();
  }

  async skip(): Promise<void> {
    await this.clearCurrentTeamAndSave();
  }

  async vote(currentTeamChosen?: boolean): Promise<void> {
    // Create a new vote object with the outcome of the vote
    await new JudgingVote(this.visitedTeams[this.visitedTeams.length - 1], this.currentTeam, currentTeamChosen).save();
    await this.recordCurrentTeamAndSave();
  }

  async recordCurrentTeamAndSave(): Promise<void> {
    this.visitedTeams.push(this.currentTeam);
    const currentTeam = await Team.findOne(this.currentTeam);
    await currentTeam.decrementActiveJudgeCount();
    await currentTeam.incrementJudgeVisits();
    this.currentTeam = null;
    await this.save();
  }

  async clearCurrentTeamAndSave(): Promise<void> {
    this.visitedTeams.unshift(this.currentTeam);
    const currentTeam = await Team.findOne(this.currentTeam);
    await currentTeam.decrementActiveJudgeCount();
    await currentTeam.incrementJudgeVisits();
    this.currentTeam = null;
    await this.save();
  }
}
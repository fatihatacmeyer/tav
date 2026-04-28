import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideUnplug } from '@lucide/angular';

export interface Door {
  id: number;
  name: string;
  floor: string;
  status: 'closed' | 'open' | 'forced' | 'disconnected';
  isCritical: boolean;
}

export interface SystemLog {
  id: number;
  doorName: string;
  action: string;
  timestamp: Date;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LucideUnplug],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit {
  doors: Door[] = [
    { id: 1, name: 'Zemin Kat Sağ ACK', floor: 'Zemin Kat', status: 'closed', isCritical: true },
    { id: 2, name: 'Zemin Kat Sol ACK', floor: 'Zemin Kat', status: 'open', isCritical: true },
    { id: 3, name: 'Salih Altuner', floor: 'Zemin Kat', status: 'closed', isCritical: false },
    { id: 4, name: 'Macro', floor: 'Zemin Kat', status: 'disconnected', isCritical: false },
    { id: 5, name: 'Bigchefs', floor: 'Cadde', status: 'closed', isCritical: false },
    { id: 6, name: 'Divan', floor: 'Cadde', status: 'closed', isCritical: false },
    { id: 7, name: '1. Kat Beymen Kapısı', floor: '1. Kat', status: 'closed', isCritical: true },
    { id: 8, name: 'Decatlon', floor: '1. Kat', status: 'closed', isCritical: false },
    { id: 9, name: 'LCW Dream', floor: '1. Kat', status: 'closed', isCritical: false },
    { id: 10, name: 'B1 ACK', floor: 'Bodrum', status: 'closed', isCritical: true },
    { id: 11, name: 'B2 ACK', floor: 'Bodrum', status: 'closed', isCritical: true },
    { id: 12, name: 'B3 ACK', floor: 'Bodrum', status: 'closed', isCritical: true },
    { id: 13, name: 'B4 ACK', floor: 'Bodrum', status: 'closed', isCritical: true },
  ];

  systemLogs: SystemLog[] = [];
  groupedDoors: { [key: string]: Door[] } = {};
  criticalDoors: Door[] = [];

  ngOnInit(): void {
    this.organizeData();
    this.addLog('System', 'System Initialized');
  }

  organizeData(): void {
    this.groupedDoors = this.doors.reduce(
      (acc, door) => {
        if (!acc[door.floor]) {
          acc[door.floor] = [];
        }
        acc[door.floor].push(door);
        return acc;
      },
      {} as { [key: string]: Door[] },
    );

    this.criticalDoors = this.doors.filter((door) => door.isCritical);
  }

  getFloors(): string[] {
    return Object.keys(this.groupedDoors);
  }

  addLog(doorName: string, action: string): void {
    const newLog: SystemLog = {
      id: Date.now(),
      doorName: doorName,
      action: action,
      timestamp: new Date(),
    };
    this.systemLogs.unshift(newLog);
  }
}

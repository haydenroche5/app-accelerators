/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable class-methods-use-this */
import { ClientDevice, DeviceTracker } from "../ClientModel";
import { DataProvider } from "../DataProvider";
import { Device, DeviceID, Project, ProjectID } from "../DomainModel";
import NotehubDevice from "./models/NotehubDevice";
import { NotehubLocationAlternatives } from "./models/NotehubLocation";
import { NotehubAccessor } from "./NotehubAccessor";

interface HasDeviceId {
  uid: string;
}

// N.B.: Noteub defines 'best' location with more nuance than we do here (e.g
// considering staleness). Also this algorithm is copy-pasted in a couple places.
export const getBestLocation = (object: NotehubLocationAlternatives) =>
  object.gps_location || object.triangulated_location || object.tower_location;

export function notehubDeviceToIndoorTracker(device: NotehubDevice) {
  return {
    uid: device.uid,
    name: device.serial_number,
    lastActivity: device.last_activity,
    ...(getBestLocation(device) && {
      location: getBestLocation(device)?.name,
    }),
  };
}

export function filterLatestEventsData(latestDeviceEvents: any) {
  const dataEvent = latestDeviceEvents.latest_events.filter(
    (event: { file: string }) => event.file === "data.qo"
  );
  // add device uid for later identification of which events belong to which device
  return {
    uid: latestDeviceEvents.uid,
    ...dataEvent[0].body,
  };
}

export function mergeObject<CombinedEventObj>(
  A: any,
  B: any
): CombinedEventObj {
  const res: any = {};
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, array-callback-return
  Object.keys({ ...A, ...B }).map((key) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    res[key] = A[key] || B[key];
  });
  return res as CombinedEventObj;
}

// merge latest event objects with the same device ID
// these are different readings from the same device
export function reducer<CombinedEventObj extends HasDeviceId>(
  groups: Map<string, CombinedEventObj>,
  event: CombinedEventObj
) {
  // make id the map's key
  const key = event.uid;
  // fetch previous map values associated with that key
  const previous = groups.get(key);
  // combine the previous map event with new map event
  const merged: CombinedEventObj = mergeObject(previous || {}, event);
  // set the key and newly merged object as the value
  groups.set(key, merged);
  return groups;
}

export default class NotehubDataProvider implements DataProvider {
  constructor(
    private readonly notehubAccessor: NotehubAccessor,
    private readonly projectID: ProjectID
  ) {}

  async getProject(): Promise<Project> {
    const project: Project = {
      id: this.projectID,
      name: "fixme",
      description: "fixme",
    };
    return project;
  }

  async getDevices(): Promise<Device[]> {
    throw new Error("Method not implemented.");
  }

  async getDevice(deviceID: DeviceID): Promise<Device | null> {
    throw new Error("Method not implemented.");
  }

  async getDeviceTrackerData(): Promise<DeviceTracker[]> {
    const trackerDevices: ClientDevice[] = [];
    let deviceUIDs: string[] = [];
    let deviceTrackerData: DeviceTracker[] = [];

    // get all the devices by fleet ID
    const rawDevices = await this.notehubAccessor.getDevicesByFleet();
    rawDevices.forEach((device) => {
      trackerDevices.push(notehubDeviceToIndoorTracker(device));
    });

    deviceUIDs = trackerDevices.map((device) => device.uid);

    // get latest events for each device in fleet by device ID
    const rawLatestEvents = await Promise.all(
      deviceUIDs.map((deviceID) =>
        this.notehubAccessor.getLatestEvents(deviceID)
      )
    );
    // filter down to just latest data.qo event for each device
    const filteredLatestEvents = rawLatestEvents.map((event) =>
      filterLatestEventsData(event)
    );

    // concat the device info from fleet with latest device info
    const combinedEventsDevices = trackerDevices.concat(filteredLatestEvents);

    // combine events with matching device IDs with helper functions defined above
    const reducedEventsIterator = combinedEventsDevices
      .reduce(reducer, new Map())
      .values();

    // transform the Map iterator obj into plain array
    deviceTrackerData = Array.from(reducedEventsIterator);
    return deviceTrackerData;
  }

  // eslint-disable-next-line class-methods-use-this
  doBulkImport(): Promise<never> {
    throw new Error("It's not possible to do bulk import of data to Notehub");
  }

  /**
   * We made the interface more general (accepting a projectID) but the implementation has the
   * ID fixed. This is a quick check to be sure the project ID is the one expected.
   * @param projectID
   */
  private checkProjectID(projectID: ProjectID) {
    if (projectID.projectUID !== this.projectID.projectUID) {
      throw new Error("Project ID does not match expected ID");
    }
  }
}
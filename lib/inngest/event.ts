export type InngestEvents = {
  "photo/uploaded": {
    data: {
      photoId: string;
      userId: string;
      url: string;
    };
  };

  "workout/completed": {
    data: {
      workoutId: string;
      userId: string;
      duration: number;
    };
  };

  "insight/generate": {
    data: {
      userId: string;
      source: "photo" | "workout" | "nutrition";
    };
  };
};

import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save, Edit2, Dumbbell, ListChecks, Crown, User, Building2, Filter, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const targetZoneOptions = [
  { value: "arms", label: "Arms" },
  { value: "chest", label: "Chest" },
  { value: "abs", label: "Abs" },
  { value: "legs", label: "Legs" },
  { value: "glutes", label: "Glutes" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
];

export default function MyWorkoutsPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("exercises");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [creatorSearchTerm, setCreatorSearchTerm] = useState("");
  
  // Exercise state
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState("");
  const [exerciseFormData, setExerciseFormData] = useState({
    name: "",
    exercise_code: "",
    description: "",
    target_goal: [],
    equipment_needed: [],
    experience_level: [],
    target_zones: [],
    stats_to_display: ["weight", "volume", "time_under_tension"],
    default_sets: 3,
    default_reps: "10-12",
    default_rest_seconds: 60,
    video_url: "",
    is_unilateral: false,
  });

  // Workout template state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [templateFormData, setTemplateFormData] = useState({
    name: "",
    description: "",
    target_goal: "build_muscle",
    target_zones: [],
    equipment_needed: "full_gym",
    fitness_level: "intermediate",
    duration_minutes: 45,
    muscle_group: "",
    exercises: [],
    is_active: true,
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isPremium = user?.subscription_tier === 'premium';
  const isAdmin = user?.role === 'admin';
  const canCreate = isPremium || isAdmin;

  // Queries
  const { data: exercises = [], isLoading: exercisesLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => base44.entities.Exercise.list('name', 500),
    enabled: !!user,
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['workout-templates'],
    queryFn: () => base44.entities.WorkoutTemplate.list('-created_date', 200),
    enabled: !!user,
  });

  // Filter exercises based on creator and search
  const filteredExercises = exercises.filter(ex => {
    const matchesExerciseSearch = !exerciseSearchTerm || 
      ex.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase());
    
    const matchesCreatorSearch = !creatorSearchTerm || 
      (ex.creator_name && ex.creator_name.toLowerCase().includes(creatorSearchTerm.toLowerCase()));
    
    let matchesCreatorFilter = true;
    if (creatorFilter === "gym_smash") matchesCreatorFilter = ex.created_by_type === "gym_smash" || !ex.created_by_type;
    else if (creatorFilter === "mine") matchesCreatorFilter = ex.created_by === user?.email;
    else if (creatorFilter === "users") matchesCreatorFilter = ex.created_by_type === "user";
    
    return matchesExerciseSearch && matchesCreatorSearch && matchesCreatorFilter;
  });

  // Filter templates based on creator and search
  const filteredTemplates = templates.filter(t => {
    const matchesCreatorSearch = !creatorSearchTerm || 
      (t.creator_name && t.creator_name.toLowerCase().includes(creatorSearchTerm.toLowerCase()));
    
    let matchesCreatorFilter = true;
    if (creatorFilter === "gym_smash") matchesCreatorFilter = t.created_by_type === "gym_smash" || !t.created_by_type;
    else if (creatorFilter === "mine") matchesCreatorFilter = t.creator_email === user?.email;
    else if (creatorFilter === "users") matchesCreatorFilter = t.created_by_type === "user";
    
    return matchesCreatorSearch && matchesCreatorFilter;
  });

  // Exercise mutations
  const createExerciseMutation = useMutation({
    mutationFn: (data) => base44.entities.Exercise.create({
      ...data,
      created_by_type: isAdmin ? "gym_smash" : "user",
      creator_name: isAdmin ? "Gym Smash" : user?.full_name,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      resetExerciseForm();
      setExerciseDialogOpen(false);
      showToast('Exercise created successfully!');
    },
  });

  const updateExerciseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Exercise.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      resetExerciseForm();
      setExerciseDialogOpen(false);
      showToast('Exercise updated!');
    },
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: (id) => base44.entities.Exercise.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      showToast('Exercise deleted!');
    },
  });

  // Template mutations
  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkoutTemplate.create({
      ...data,
      created_by_type: isAdmin ? "gym_smash" : "user",
      creator_name: isAdmin ? "Gym Smash" : user?.full_name,
      creator_email: user?.email,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
      resetTemplateForm();
      setTemplateDialogOpen(false);
      showToast('Workout created successfully!');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkoutTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
      resetTemplateForm();
      setTemplateDialogOpen(false);
      showToast('Workout updated!');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkoutTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
      showToast('Workout deleted!');
    },
  });

  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
    toast.textContent = `✅ ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const resetExerciseForm = () => {
    setExerciseFormData({
      name: "",
      exercise_code: "",
      description: "",
      target_goal: [],
      equipment_needed: [],
      experience_level: [],
      target_zones: [],
      stats_to_display: ["weight", "volume", "time_under_tension"],
      default_sets: 3,
      default_reps: "10-12",
      default_rest_seconds: 60,
      video_url: "",
      is_unilateral: false,
    });
    setEditingExercise(null);
  };

  const resetTemplateForm = () => {
    setTemplateFormData({
      name: "",
      description: "",
      target_goal: "build_muscle",
      target_zones: [],
      equipment_needed: "full_gym",
      fitness_level: "intermediate",
      duration_minutes: 45,
      muscle_group: "",
      exercises: [],
      is_active: true,
    });
    setEditingTemplate(null);
    setSelectedExercises([]);
  };

  const handleEditExercise = (exercise) => {
    // Only allow editing own exercises or admin can edit all
    if (!isAdmin && exercise.created_by !== user?.email) {
      alert("You can only edit exercises you created.");
      return;
    }
    setEditingExercise(exercise);
    setExerciseFormData({
      name: exercise.name || "",
      exercise_code: exercise.exercise_code || "",
      description: exercise.description || "",
      target_goal: Array.isArray(exercise.target_goal) ? exercise.target_goal : [],
      equipment_needed: Array.isArray(exercise.equipment_needed) ? exercise.equipment_needed : [],
      experience_level: Array.isArray(exercise.experience_level) ? exercise.experience_level : [],
      target_zones: exercise.target_zones || [],
      stats_to_display: exercise.stats_to_display || ["weight", "volume", "time_under_tension"],
      default_sets: exercise.default_sets || 3,
      default_reps: exercise.default_reps || "10-12",
      default_rest_seconds: exercise.default_rest_seconds || 60,
      video_url: exercise.video_url || "",
      is_unilateral: exercise.is_unilateral || false,
    });
    setExerciseDialogOpen(true);
  };

  const handleEditTemplate = (template) => {
    if (!isAdmin && template.creator_email !== user?.email) {
      alert("You can only edit workouts you created.");
      return;
    }
    setEditingTemplate(template);
    setTemplateFormData({
      ...template,
      target_zones: template.target_zones || [],
    });
    setTemplateDialogOpen(true);
  };

  const handleSubmitExercise = () => {
    if (!exerciseFormData.name || exerciseFormData.target_zones.length === 0) {
      alert("Please fill in name and select at least one target zone");
      return;
    }

    const dataToSave = {
      ...exerciseFormData,
      exercise_code: exerciseFormData.exercise_code || exerciseFormData.name.toUpperCase().replace(/\s+/g, '_'),
    };

    if (editingExercise) {
      updateExerciseMutation.mutate({ id: editingExercise.id, data: dataToSave });
    } else {
      createExerciseMutation.mutate(dataToSave);
    }
  };

  const handleAddExercisesToTemplate = () => {
    const exercisesToAdd = selectedExercises.map(ex => ({
      name: ex.name,
      exercise_code: ex.exercise_code || ex.id,
      sets: ex.default_sets || 3,
      reps: ex.default_reps || "10-12",
      rest_seconds: ex.default_rest_seconds || 60,
      notes: ex.description || "",
      video_url: ex.video_url || "",
      is_unilateral: ex.is_unilateral || false,
    }));

    setTemplateFormData(prev => ({
      ...prev,
      exercises: [...prev.exercises, ...exercisesToAdd]
    }));
    setSelectedExercises([]);
    setShowExercisePicker(false);
  };

  const handleRemoveExerciseFromTemplate = (index) => {
    setTemplateFormData(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const handleSubmitTemplate = () => {
    if (!templateFormData.name || templateFormData.target_zones.length === 0 || templateFormData.exercises.length === 0) {
      alert("Please fill in name, target zones, and add exercises");
      return;
    }

    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateFormData });
    } else {
      createTemplateMutation.mutate(templateFormData);
    }
  };

  const canEditExercise = (exercise) => isAdmin || exercise.created_by === user?.email;
  const canEditTemplate = (template) => isAdmin || template.creator_email === user?.email;

  if (!user || exercisesLoading || templatesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <Card className="border-none shadow-2xl bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="text-center py-16">
            <Crown className="w-16 h-16 mx-auto mb-4 text-amber-500" />
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Premium Feature</h1>
            <p className="text-slate-600 mb-6">
              Create your own exercises and workouts with a Premium subscription.
            </p>
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              Upgrade to Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">My Workouts</h1>
        <p className="text-slate-600">Create and manage your own exercises and workouts</p>
      </div>

      {/* Creator Filter */}
      <Card className="mb-6 border-none shadow-lg bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Filter by Creator:</span>
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by creator name..."
                value={creatorSearchTerm}
                onChange={(e) => setCreatorSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={creatorFilter === "all" ? "default" : "outline"}
                onClick={() => setCreatorFilter("all")}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={creatorFilter === "gym_smash" ? "default" : "outline"}
                onClick={() => setCreatorFilter("gym_smash")}
                className={creatorFilter === "gym_smash" ? "bg-orange-600 hover:bg-orange-700" : ""}
              >
                <Building2 className="w-4 h-4 mr-1" />
                Gym Smash
              </Button>
              <Button
                size="sm"
                variant={creatorFilter === "mine" ? "default" : "outline"}
                onClick={() => setCreatorFilter("mine")}
                className={creatorFilter === "mine" ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                <User className="w-4 h-4 mr-1" />
                My Creations
              </Button>
              {isAdmin && (
                <Button
                  size="sm"
                  variant={creatorFilter === "users" ? "default" : "outline"}
                  onClick={() => setCreatorFilter("users")}
                  className={creatorFilter === "users" ? "bg-purple-600 hover:bg-purple-700" : ""}
                >
                  <User className="w-4 h-4 mr-1" />
                  User Created
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="exercises" className="flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            Exercises ({filteredExercises.length})
          </TabsTrigger>
          <TabsTrigger value="workouts" className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Workouts ({filteredTemplates.length})
          </TabsTrigger>
        </TabsList>

        {/* EXERCISES TAB */}
        <TabsContent value="exercises" className="mt-6">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <Input
              placeholder="Search exercises..."
              value={exerciseSearchTerm}
              onChange={(e) => setExerciseSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Dialog open={exerciseDialogOpen} onOpenChange={setExerciseDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => resetExerciseForm()}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Exercise
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingExercise ? 'Edit Exercise' : 'Create New Exercise'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Exercise Name *</label>
                    <Input
                      value={exerciseFormData.name}
                      onChange={(e) => setExerciseFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Barbell Squat"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Textarea
                      value={exerciseFormData.description}
                      onChange={(e) => setExerciseFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Instructions or form cues"
                      className="h-20"
                    />
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-orange-900 mb-3">Target Zones *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {targetZoneOptions.map(opt => (
                        <div key={opt.value} className="flex items-center space-x-2 bg-white p-2 rounded border">
                          <Checkbox
                            id={`zone-${opt.value}`}
                            checked={exerciseFormData.target_zones.includes(opt.value)}
                            onCheckedChange={(checked) => {
                              setExerciseFormData(prev => ({
                                ...prev,
                                target_zones: checked
                                  ? [...prev.target_zones, opt.value]
                                  : prev.target_zones.filter(z => z !== opt.value)
                              }));
                            }}
                          />
                          <label htmlFor={`zone-${opt.value}`} className="text-sm cursor-pointer">{opt.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <label className="block text-sm font-semibold mb-2">Fitness Goals</label>
                      <div className="space-y-2">
                        {["tone_body", "build_muscle"].map(goal => (
                          <div key={goal} className="flex items-center space-x-2">
                            <Checkbox
                              id={`goal-${goal}`}
                              checked={exerciseFormData.target_goal.includes(goal)}
                              onCheckedChange={(checked) => {
                                setExerciseFormData(prev => ({
                                  ...prev,
                                  target_goal: checked
                                    ? [...prev.target_goal, goal]
                                    : prev.target_goal.filter(g => g !== goal)
                                }));
                              }}
                            />
                            <label htmlFor={`goal-${goal}`} className="text-sm cursor-pointer capitalize">
                              {goal.replace(/_/g, ' ')}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <label className="block text-sm font-semibold mb-2">Equipment</label>
                      <div className="space-y-2">
                        {["full_gym", "bodyweight_only"].map(equip => (
                          <div key={equip} className="flex items-center space-x-2">
                            <Checkbox
                              id={`equip-${equip}`}
                              checked={exerciseFormData.equipment_needed.includes(equip)}
                              onCheckedChange={(checked) => {
                                setExerciseFormData(prev => ({
                                  ...prev,
                                  equipment_needed: checked
                                    ? [...prev.equipment_needed, equip]
                                    : prev.equipment_needed.filter(e => e !== equip)
                                }));
                              }}
                            />
                            <label htmlFor={`equip-${equip}`} className="text-sm cursor-pointer capitalize">
                              {equip.replace(/_/g, ' ')}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Sets</label>
                      <Input
                        type="number"
                        value={exerciseFormData.default_sets}
                        onChange={(e) => setExerciseFormData(prev => ({ ...prev, default_sets: parseInt(e.target.value) || 3 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Reps</label>
                      <Input
                        value={exerciseFormData.default_reps}
                        onChange={(e) => setExerciseFormData(prev => ({ ...prev, default_reps: e.target.value }))}
                        placeholder="e.g., 10-12"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Rest (sec)</label>
                      <Input
                        type="number"
                        value={exerciseFormData.default_rest_seconds}
                        onChange={(e) => setExerciseFormData(prev => ({ ...prev, default_rest_seconds: parseInt(e.target.value) || 60 }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                    <Checkbox
                      id="is_unilateral"
                      checked={exerciseFormData.is_unilateral}
                      onCheckedChange={(checked) => setExerciseFormData(prev => ({ ...prev, is_unilateral: checked }))}
                    />
                    <label htmlFor="is_unilateral" className="text-sm cursor-pointer">
                      Single Arm/Leg Exercise (Unilateral)
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Video URL (optional)</label>
                    <Input
                      value={exerciseFormData.video_url}
                      onChange={(e) => setExerciseFormData(prev => ({ ...prev, video_url: e.target.value }))}
                      placeholder="https://youtube.com/..."
                    />
                  </div>

                  <Button
                    onClick={handleSubmitExercise}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingExercise ? 'Update Exercise' : 'Create Exercise'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExercises.map(exercise => (
              <Card key={exercise.id} className="border-none shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{exercise.name}</CardTitle>
                    {exercise.created_by_type === "user" ? (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        <User className="w-3 h-3 mr-1" />
                        {exercise.creator_name || 'User'}
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-800 text-xs">
                        <Building2 className="w-3 h-3 mr-1" />
                        Gym Smash
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {exercise.description && (
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{exercise.description}</p>
                  )}
                  <div className="flex gap-1 flex-wrap mb-3">
                    {exercise.target_zones?.slice(0, 3).map(zone => (
                      <Badge key={zone} variant="secondary" className="text-xs">
                        {zone}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    {exercise.default_sets} sets × {exercise.default_reps} reps
                  </p>
                  {canEditExercise(exercise) && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditExercise(exercise)} className="flex-1">
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Delete this exercise?')) deleteExerciseMutation.mutate(exercise.id);
                        }}
                        className="text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredExercises.length === 0 && (
            <Card className="p-12 text-center">
              <Dumbbell className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-600">No exercises found</p>
            </Card>
          )}
        </TabsContent>

        {/* WORKOUTS TAB */}
        <TabsContent value="workouts" className="mt-6">
          <div className="flex justify-end mb-6">
            <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => resetTemplateForm()}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Workout
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingTemplate ? 'Edit Workout' : 'Create New Workout'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Workout Name *</label>
                    <Input
                      value={templateFormData.name}
                      onChange={(e) => setTemplateFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Upper Body Strength"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Textarea
                      value={templateFormData.description}
                      onChange={(e) => setTemplateFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="h-20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Goal</label>
                      <Select
                        value={templateFormData.target_goal}
                        onValueChange={(v) => setTemplateFormData(prev => ({ ...prev, target_goal: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tone_body">Tone Body</SelectItem>
                          <SelectItem value="build_muscle">Build Muscle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Duration (min)</label>
                      <Input
                        type="number"
                        value={templateFormData.duration_minutes}
                        onChange={(e) => setTemplateFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 45 }))}
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold mb-3">Target Zones *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {targetZoneOptions.map(opt => (
                        <div key={opt.value} className="flex items-center space-x-2 bg-white p-2 rounded border">
                          <Checkbox
                            checked={templateFormData.target_zones.includes(opt.value)}
                            onCheckedChange={(checked) => {
                              setTemplateFormData(prev => ({
                                ...prev,
                                target_zones: checked
                                  ? [...prev.target_zones, opt.value]
                                  : prev.target_zones.filter(z => z !== opt.value)
                              }));
                            }}
                          />
                          <label className="text-sm cursor-pointer">{opt.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Exercises Section */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Exercises ({templateFormData.exercises.length})</h3>
                      <Button onClick={() => setShowExercisePicker(true)} variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" /> Add Exercises
                      </Button>
                    </div>

                    {templateFormData.exercises.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed">
                        <p className="text-sm text-slate-600">Click "Add Exercises" to build your workout</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {templateFormData.exercises.map((ex, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                              <p className="font-medium">{ex.name}</p>
                              <p className="text-sm text-slate-600">{ex.sets} sets × {ex.reps} reps</p>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => handleRemoveExerciseFromTemplate(index)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleSubmitTemplate}
                    disabled={!templateFormData.name || templateFormData.exercises.length === 0}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingTemplate ? 'Update Workout' : 'Create Workout'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <Card key={template.id} className="border-none shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.created_by_type === "user" ? (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        <User className="w-3 h-3 mr-1" />
                        {template.creator_name || 'User'}
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-800 text-xs">
                        <Building2 className="w-3 h-3 mr-1" />
                        Gym Smash
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {template.description && (
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{template.description}</p>
                  )}
                  <div className="flex gap-1 flex-wrap mb-2">
                    {template.target_zones?.slice(0, 3).map(zone => (
                      <Badge key={zone} variant="secondary" className="text-xs">{zone}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    {template.duration_minutes} min • {template.exercises?.length || 0} exercises
                  </p>
                  {canEditTemplate(template) && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditTemplate(template)} className="flex-1">
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Delete this workout?')) deleteTemplateMutation.mutate(template.id);
                        }}
                        className="text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <Card className="p-12 text-center">
              <Dumbbell className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-600">No workouts found</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Exercise Picker Dialog */}
      <Dialog open={showExercisePicker} onOpenChange={setShowExercisePicker}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Select Exercises</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-2">
              {exercises.map(exercise => {
                const isSelected = selectedExercises.some(e => e.id === exercise.id);
                const isAlreadyInTemplate = templateFormData.exercises.some(e => e.name === exercise.name);

                return (
                  <div
                    key={exercise.id}
                    className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      isAlreadyInTemplate ? 'border-green-200 bg-green-50 opacity-60' :
                      isSelected ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => {
                      if (!isAlreadyInTemplate) {
                        setSelectedExercises(prev =>
                          prev.find(e => e.id === exercise.id)
                            ? prev.filter(e => e.id !== exercise.id)
                            : [...prev, exercise]
                        );
                      }
                    }}
                  >
                    <Checkbox checked={isSelected || isAlreadyInTemplate} disabled={isAlreadyInTemplate} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{exercise.name}</span>
                        {exercise.created_by_type === "user" && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">User</Badge>
                        )}
                        {isAlreadyInTemplate && (
                          <Badge className="bg-green-100 text-green-800 text-xs">Added</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{exercise.default_sets} sets × {exercise.default_reps}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => { setSelectedExercises([]); setShowExercisePicker(false); }} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleAddExercisesToTemplate}
              disabled={selectedExercises.length === 0}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              Add {selectedExercises.length} Exercise{selectedExercises.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useLocalSearchParams } from 'expo-router';
import { PhotoDetailScreen } from '@/views/photo/PhotoDetailScreen';

export default function PhotoDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PhotoDetailScreen photoId={id} />;
}
